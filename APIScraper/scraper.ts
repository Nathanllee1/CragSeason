
import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';
import {
  /* inserts */
  insertArea,
  insertRoute,
  insertSection,
  insertTicksMany,
  /* look‑ups */
  selectArea,               // SELECT * FROM areas WHERE id = ?
  selectChildAreas,         // SELECT id, children_complete FROM areas  WHERE parent_id = ?
  selectChildRoutes,        // SELECT id FROM routes WHERE area_id   = ?
  hasTicks,                 // SELECT 1 FROM ticks WHERE route_id   = ? LIMIT 1
  /* flags */
  markAreaComplete,          // UPDATE areas SET children_complete = 1 WHERE id = ?
  selectRoute
} from './db';

export interface AreaChild {
  id: number;
  type: 'Area' | 'Route';
}

export interface AreaApi {
  id: number;
  title: string;
  parent: { id: number; name: string } | null;
  package_id: number;
  breadcrumbs: string;
  is_leaf: boolean;
  url: string;
  coordinates: [number, number];
  radius: number;
  summary: string;
  sections: { title: string; html: string }[];
  access_notes: string[];
  thumbnail: string | null;
  rating: number;
  popularity: number;
  depth: number;
  submitted_by: string;
  children: AreaChild[];
}

export interface RouteApi {
  id: number;
  title: string;
  area_id: number;
  parent: { id: number; name: string; coordinates: [number, number] } | null;
  package_id: number;
  url: string;
  difficulty: string;
  pitches: number;
  height_feet: number | null;
  types: string[];
  summary: string;
  sections: { title: string; html: string }[];
  access_notes: string[];
  rating: number;
  popularity: number;
  thumbnail: string | null;
  first_ascent: string | null;
  submitted_by: string | null;
}

export interface TickApi {
  id: number;
  date: string;
  comment: string | null;
  style: string;
  leadStyle: string;
  pitches: number;
  text: string | false;
  createdAt: string;
  updatedAt: string;
  user: false | { id: number; name: string };
}

export type RootArea = { id: number };

// Top‑level areas to start scraping from.  Lives in `rootAreas.ts`.
import rootAreas from './rootAreas';

// ───────────────────────────────────────────────────────────────────────────────
// Networking helpers (unchanged except for rate‑count bookkeeping)
// ───────────────────────────────────────────────────────────────────────────────

const RATE_LIMIT_MS = 0; // caller can bump if hammering the API for real
let lastRequestTime = 0;
let requestCount    = 0;
export let MAX_REQUESTS = 100_000_000;
export function setMaxRequests(v: number) { MAX_REQUESTS = v; }
export function getRequestCount()        { return requestCount; }
export function resetRequestCount()      { requestCount = 0; }

async function fetchJson<T>(url: string, attempt = 0): Promise<T> {
  const proxy   = process.env.http_proxy || process.env.HTTP_PROXY;
  const options = proxy ? { agent: new HttpsProxyAgent(proxy) } : {};

  console.log(`Fetching: ${url} (attempt ${attempt + 1})`);

  const now  = Date.now();
  const wait = RATE_LIMIT_MS - (now - lastRequestTime);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastRequestTime = Date.now();
  requestCount++;

  const MAX_RETRIES = 5;
  const res = await fetch(url, options).catch(err => attempt < MAX_RETRIES ? null : Promise.reject(err));

  if (!res) {
    await new Promise(r => setTimeout(r, 2 ** attempt * 1_000));
    return fetchJson<T>(url, attempt + 1);
  }
  if (res.status === 429 || res.status >= 500) {
    if (attempt < MAX_RETRIES) {
      await new Promise(r => setTimeout(r, 2 ** attempt * 1_000));
      return fetchJson<T>(url, attempt + 1);
    }
  }
  if (!res.ok) throw new Error(`Failed ${url}: ${res.status}`);
  return res.json() as Promise<T>;
}

// ───────────────────────────────────────────────────────────────────────────────
// Traversal entry‑point helpers
// ───────────────────────────────────────────────────────────────────────────────

export function parseRootAreas(): RootArea[] {
  return rootAreas.map(id => ({ id }));
}

/**
 * Recursively walk an area.  If we have a row **and** its `children_complete`
 * flag is set, we stay offline and grab the child IDs from SQLite. Otherwise
 * we re‑pull the JSON (idempotent) to finish / resume.
 */
export async function processArea(id: number, parentId: number | null): Promise<void> {
  const stored = selectArea.get(id) as { is_leaf?: number; children_complete?: number } | undefined;

  if (stored && stored.children_complete === 1) {
    // Fast‑path: descend completely offline ➜
    for (const { id: childId, children_complete } of selectChildAreas.all(id) as { id: number; children_complete: number }[]) {
      await processArea(childId, id); // children_complete check happens recursively
    }
    for (const { id: routeId } of selectChildRoutes.all(id) as { id: number }[]) {
      await processRoute(routeId, id);
    }
    return;
  }

  // Slow‑path (initial scrape or crash‑resume)
  if (requestCount >= MAX_REQUESTS) return;
  const url = `https://www.mountainproject.com/api/v2/areas/${id}`;

  let data: AreaApi;
  try { data = await fetchJson<AreaApi>(url); }
  catch { return; }

  if (!stored) {
    // first time we see this area ➜ insert row + static blobs
    insertArea.run({
      id: data.id,
      title: data.title,
      parent_id: parentId,
      package_id: data.package_id,
      breadcrumbs: data.breadcrumbs,
      is_leaf: data.is_leaf ? 1 : 0,
      url: data.url,
      lat: data.coordinates[1] || null,
      lon: data.coordinates[0] || null,
      radius: data.radius,
      summary: data.summary,
      rating: data.rating,
      popularity: data.popularity,
      depth: data.depth,
      submitted_by: data.submitted_by,
      children_complete: 0 // default
    });
    for (const s of data.sections) {
      insertSection.run({ parent_type: 'area', parent_id: data.id, title: s.title, html: s.html });
    }
  }

  // descend depth‑first (this may resume half‑done branches)
  for (const child of data.children) {
    if (child.type === 'Area') {
      await processArea(child.id, data.id);
    } else {
      await processRoute(child.id, data.id);
    }
  }

  // Mark area as fully processed so future runs can skip network
  markAreaComplete.run(id);
}

/**
 * Fetch a single route unless it’s already cached.  We *always* double‑check
 * tick history because that’s append‑only and cheap to query.
 */
export async function processRoute(id: number, areaId: number): Promise<void> {
  const already = selectRoute.get(id) as { id: number } | undefined;

  if (already) {
    if (!hasTicks.get(id)) await processTicks(id); // grab ticks if none yet
    return;                                         // skip network fetch
  }

  if (requestCount >= MAX_REQUESTS) return;
  const url = `https://www.mountainproject.com/api/v2/routes/${id}`;

  let data: RouteApi;
  try { data = await fetchJson<RouteApi>(url); }
  catch { return; }

  insertRoute.run({
    id: data.id,
    area_id: areaId,
    title: data.title,
    package_id: data.package_id,
    url: data.url,
    difficulty: data.difficulty,
    pitches: data.pitches,
    height_feet: data.height_feet,
    types: JSON.stringify(data.types),
    summary: data.summary,
    rating: data.rating,
    popularity: data.popularity,
    thumbnail: data.thumbnail,
    first_ascent: data.first_ascent,
    submitted_by: data.submitted_by
  });
  for (const s of data.sections) {
    insertSection.run({ parent_type: 'route', parent_id: data.id, title: s.title, html: s.html });
  }

  await processTicks(id);   // idempotent; duplicates ignored by PK
}

/**
 * Download (or refresh) all ticks for a route.
 */
export async function processTicks(routeId: number): Promise<void> {
  let page = 1;

  while (true) {
    if (requestCount >= MAX_REQUESTS) return;
    const url = `https://www.mountainproject.com/api/v2/routes/${routeId}/ticks?page=${page}`;

    let json: { data: TickApi[]; next_page_url: string | null };
    try { json = await fetchJson<any>(url); }
    catch { break; }

    const batch = (json.data ?? []).map(tick => ({
      id: tick.id,
      route_id: routeId,
      date: tick.date,
      comment: tick.comment,
      style: tick.style,
      leadStyle: tick.leadStyle,
      pitches: tick.pitches,
      text: tick.text === false ? null : tick.text,
      createdAt: tick.createdAt,
      updatedAt: tick.updatedAt,
      user_id: tick.user && typeof tick.user !== 'boolean' ? tick.user.id : null,
      user_name: tick.user && typeof tick.user !== 'boolean' ? tick.user.name : null
    }));

    if (batch.length) insertTicksMany(batch);
    if (!json.next_page_url) break;
    page++;
  }
}
