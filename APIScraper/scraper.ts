// Core scraping logic.  Each function mirrors a Mountain Project API endpoint
// and stores the resulting data in SQLite using helpers from `db.ts`.
import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';
import {
  insertArea,
  insertRoute,
  insertSection,
  insertTick,
  selectArea,
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

// Top-level areas to start scraping from. The list lives in `rootAreas.ts` to
// keep it simple and avoid parsing another file.
import rootAreas from './rootAreas';

// Rate limit to be kind to the API: max 4 requests per second
const RATE_LIMIT_MS = 250;
let lastRequestTime = 0;

export function parseRootAreas(): RootArea[] {
  return rootAreas.map(id => ({ id }));
}

// Utility used by all network calls.  Honors the `http_proxy` environment
// variable for environments that require a proxy.  Implements exponential
// backoff with retries when the server responds with rate limiting or
// transient errors.
async function fetchJson<T>(url: string, attempt = 0): Promise<T> {
  const proxy = process.env.http_proxy || process.env.HTTP_PROXY;
  const options: any = {};
  if (proxy) {
    options.agent = new HttpsProxyAgent(proxy);
  }

  const MAX_RETRIES = 5;

  // rate limiting
  const now = Date.now();
  const wait = RATE_LIMIT_MS - (now - lastRequestTime);
  if (wait > 0) {
    await new Promise(r => setTimeout(r, wait));
  }
  lastRequestTime = Date.now();
  requestCount++;

  const res = await fetch(url, options).catch(err => {
    if (attempt < MAX_RETRIES) return null;
    throw err;
  });

  if (!res) {
    await new Promise(r => setTimeout(r, 2 ** attempt * 1000));
    return fetchJson<T>(url, attempt + 1);
  }

  if (res.status === 429 || res.status >= 500) {
    if (attempt < MAX_RETRIES) {
      await new Promise(r => setTimeout(r, 2 ** attempt * 1000));
      return fetchJson<T>(url, attempt + 1);
    }
  }

  if (!res.ok) throw new Error(`Failed ${url}: ${res.status}`);
  return res.json() as Promise<T>;
}

let requestCount = 0;
export let MAX_REQUESTS = 100000;
export function setMaxRequests(v: number) {
  MAX_REQUESTS = v;
}

/**
 * Recursively download an area and all of its children.  The parent area ID is
 * stored so the hierarchy can be reconstructed later.  Routes and sub-areas are
 * visited depth-first.
 */
export async function processArea(id: number, parentId: number | null): Promise<void> {
  if (selectArea.get(id)) return; // already processed
  if (requestCount >= MAX_REQUESTS) return;
  const url = `https://www.mountainproject.com/api/v2/areas/${id}`;
  let data: AreaApi;
  try {
    data = await fetchJson<AreaApi>(url);
  } catch {
    return;
  }

  if (!selectArea.get(id)) {
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
      submitted_by: data.submitted_by
    });
    for (const s of data.sections) {
      insertSection.run({ parent_type: 'area', parent_id: data.id, title: s.title, html: s.html });
    }
  }

  for (const child of data.children) {
    if (child.type === 'Area') {
      await processArea(child.id, data.id);
    } else if (child.type === 'Route') {
      await processRoute(child.id, data.id);
    }
  }
}

/**
 * Fetch detailed information for a single route and insert it if we haven't
 * seen it before.  Once the route itself is stored the function proceeds to
 * download all tick history for that route.
 */
export async function processRoute(id: number, areaId: number): Promise<void> {
  if (selectRoute.get(id)) return; // already processed
  if (requestCount >= MAX_REQUESTS) return;
  const url = `https://www.mountainproject.com/api/v2/routes/${id}`;
  let data: RouteApi;
  try {
    data = await fetchJson<RouteApi>(url);
  } catch {
    return;
  }

  if (!selectRoute.get(id)) {
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
  }

  await processTicks(id);
}

/**
 * Download tick history for a route.  The API is paginated, so we loop until
 * no `next_page_url` is returned.  Each tick is inserted individually.
 */
export async function processTicks(routeId: number): Promise<void> {
  let page = 1;
  while (true) {
    if (requestCount >= MAX_REQUESTS) return;
    const url = `https://www.mountainproject.com/api/v2/routes/${routeId}/ticks?page=${page}`;
    let json: any;
    try {
      json = await fetchJson<any>(url);
    } catch {
      break;
    }
    const ticks: TickApi[] = json.data || [];
    for (const tick of ticks) {
      insertTick.run({
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
      });
    }
    if (!json.next_page_url) break;
    page++;
  }
}

// Helpers mainly used by tests or the CLI to report progress and to reset the
// request counter between runs.
export function getRequestCount() {
  return requestCount;
}

export function resetRequestCount() {
  requestCount = 0;
}

