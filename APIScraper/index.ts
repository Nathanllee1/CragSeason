// Entry point for the API scraper.  It initialises the database schema and
// processes all root areas listed in `rootAreas.ts`.
import { init } from './db';
import * as scraper from './scraper';
import sqlite3 from 'better-sqlite3';

init();
// Limit requests during CI runs so the script completes quickly.
scraper.setMaxRequests(parseInt(process.env.MAX_REQUESTS || '100', 10));

async function main() {
  const roots = scraper.parseRootAreas();
  // Process every root area sequentially so that the scraper can resume if it
  // is interrupted.  Each call recursively descends into sub-areas and routes.
  for (const root of roots) {
    await scraper.processArea(root.id, null);
  }
  console.log('Completed. Total requests:', scraper.getRequestCount());

  // After scraping, open the database again (in read-only mode) to print some
  // quick validation counts for CI logs.
  const db = new sqlite3(require('path').join(__dirname, 'mountainproject.db'));
  const areaCount = (db.prepare('select count(*) as c from areas').get() as any).c;
  const routeCount = (db.prepare('select count(*) as c from routes').get() as any).c;
  const tickCount = (db.prepare('select count(*) as c from ticks').get() as any).c;
  console.log(`Areas: ${areaCount}, Routes: ${routeCount}, Ticks: ${tickCount}`);
  db.close();
}

main().catch(err => {
  console.error(err);
});
