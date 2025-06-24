import { strict as assert } from 'assert';
// @ts-ignore - no types
import mock from 'mock-require';

const areaData: Record<number, any> = {
  1: {
    id: 1,
    title: 'Root',
    parent: null,
    package_id: 0,
    breadcrumbs: '',
    is_leaf: false,
    url: 'root',
    coordinates: [0, 0],
    radius: 0,
    summary: '',
    sections: [],
    access_notes: [],
    thumbnail: null,
    rating: 0,
    popularity: 0,
    depth: 0,
    submitted_by: '',
    children: [ { id: 10, type: 'Area' }, { id: 11, type: 'Area' } ]
  },
  10: {
    id: 10,
    title: 'ChildA',
    parent: { id: 1, name: 'Root' },
    package_id: 0,
    breadcrumbs: '',
    is_leaf: true,
    url: 'a',
    coordinates: [0,0],
    radius: 0,
    summary: '',
    sections: [],
    access_notes: [],
    thumbnail: null,
    rating: 0,
    popularity: 0,
    depth: 1,
    submitted_by: '',
    children: [ { id: 100, type: 'Route' }, { id: 101, type: 'Route' } ]
  },
  11: {
    id: 11,
    title: 'ChildB',
    parent: { id: 1, name: 'Root' },
    package_id: 0,
    breadcrumbs: '',
    is_leaf: true,
    url: 'b',
    coordinates: [0,0],
    radius: 0,
    summary: '',
    sections: [],
    access_notes: [],
    thumbnail: null,
    rating: 0,
    popularity: 0,
    depth: 1,
    submitted_by: '',
    children: [ { id: 102, type: 'Route' } ]
  }
};

const routeData: Record<number, any> = {
  100: {
    id: 100,
    title: 'R1',
    area_id: 10,
    parent: null,
    package_id: 0,
    url: 'r1',
    difficulty: '',
    pitches: 1,
    height_feet: null,
    types: [],
    summary: '',
    sections: [],
    access_notes: [],
    rating: 0,
    popularity: 0,
    thumbnail: null,
    first_ascent: null,
    submitted_by: null
  },
  101: {
    id: 101,
    title: 'R2',
    area_id: 10,
    parent: null,
    package_id: 0,
    url: 'r2',
    difficulty: '',
    pitches: 1,
    height_feet: null,
    types: [],
    summary: '',
    sections: [],
    access_notes: [],
    rating: 0,
    popularity: 0,
    thumbnail: null,
    first_ascent: null,
    submitted_by: null
  },
  102: {
    id: 102,
    title: 'R3',
    area_id: 11,
    parent: null,
    package_id: 0,
    url: 'r3',
    difficulty: '',
    pitches: 1,
    height_feet: null,
    types: [],
    summary: '',
    sections: [],
    access_notes: [],
    rating: 0,
    popularity: 0,
    thumbnail: null,
    first_ascent: null,
    submitted_by: null
  }
};

function fetchStub(url: string) {
  if (url.includes('/areas/')) {
    const id = Number(url.split('/areas/')[1]);
    return Promise.resolve({ ok: true, status: 200, json: async () => areaData[id] });
  }
  if (url.includes('/ticks')) {
    return Promise.resolve({ ok: true, status: 200, json: async () => ({ data: [], next_page_url: null }) });
  }
  const id = Number(url.split('/routes/')[1]);
  return Promise.resolve({ ok: true, status: 200, json: async () => routeData[id] });
}

const db = (() => {
  const areas = new Map<number, any>();
  const routes = new Map<number, any>();
  const sections: any[] = [];
  const ticks: any[] = [];
  return {
    insertArea: { run: (row: any) => { areas.set(row.id, row); } },
    insertRoute: { run: (row: any) => { routes.set(row.id, row); } },
    insertSection: { run: (row: any) => { sections.push(row); } },
    insertTick: { run: (row: any) => { ticks.push(row); } },
    insertTicksMany: (rows: any[]) => { rows.forEach(r => ticks.push(r)); },
    selectRoute: { get: (id: number) => routes.has(id) ? 1 : undefined },
    selectArea: { get: (id: number) => areas.has(id) ? 1 : undefined },
    selectAreaLeaf: { get: (id: number) => { const a = areas.get(id); return a ? { is_leaf: a.is_leaf ? 1 : 0 } : undefined; } },
    hasChildAreas: { get: (id: number) => { for (const a of areas.values()) if (a.parent_id === id) return 1; return undefined; } },
    hasChildRoutes: { get: (id: number) => { for (const r of routes.values()) if (r.area_id === id) return 1; return undefined; } },
    hasTicks: { get: (id: number) => { for (const t of ticks) if (t.route_id === id) return 1; return undefined; } },
    areas,
    routes
  };
})();

mock('node-fetch', Object.assign((url: string) => fetchStub(url), { default: (url: string) => fetchStub(url) }));
mock('../db', db);

const scraper = require('../scraper');

async function run() {
  scraper.setMaxRequests(3);
  await scraper.processArea(1, null);

  assert.deepEqual([...db.areas.keys()].sort((a,b)=>a-b), [1,10]);
  assert.deepEqual([...db.routes.keys()], [100]);

  scraper.resetRequestCount();
  scraper.setMaxRequests(100);
  await scraper.processArea(1, null);

  assert.deepEqual([...db.areas.keys()].sort((a,b)=>a-b), [1,10,11]);
  assert.deepEqual([...db.routes.keys()].sort((a,b)=>a-b), [100,101,102]);
  console.log('tests passed');
}

run().catch(err => { console.error(err); process.exit(1); });
