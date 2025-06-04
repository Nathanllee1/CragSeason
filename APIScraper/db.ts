/** Simple SQLite wrapper used by the scraper.
 *  The database file lives alongside the script so that successive runs can
 *  reuse previously downloaded data. */
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(__dirname, 'mountainproject.db');
export const db = new Database(dbPath);

// Ensure tables exist before any prepared statements are created.
init();

/**
 * Ensure all tables exist.  This can be called multiple times without
 * recreating data because all CREATE statements use IF NOT EXISTS.
 */
export function init() {
  db.exec(`
  CREATE TABLE IF NOT EXISTS areas (
    id INTEGER PRIMARY KEY,
    title TEXT,
    parent_id INTEGER,
    package_id INTEGER,
    breadcrumbs TEXT,
    is_leaf INTEGER,
    url TEXT,
    lat REAL,
    lon REAL,
    radius REAL,
    summary TEXT,
    rating REAL,
    popularity REAL,
    depth INTEGER,
    submitted_by TEXT
  );


  CREATE TABLE IF NOT EXISTS routes (
    id INTEGER PRIMARY KEY,
    area_id INTEGER,
    title TEXT,
    package_id INTEGER,
    url TEXT,
    difficulty TEXT,
    pitches INTEGER,
    height_feet INTEGER,
    types TEXT,
    summary TEXT,
    rating REAL,
    popularity REAL,
    thumbnail TEXT,
    first_ascent TEXT,
    submitted_by TEXT,
    FOREIGN KEY(area_id) REFERENCES areas(id)
  );

  CREATE TABLE IF NOT EXISTS sections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_type TEXT,
    parent_id INTEGER,
    title TEXT,
    html TEXT
  );

  CREATE TABLE IF NOT EXISTS ticks (
    id INTEGER PRIMARY KEY,
    route_id INTEGER,
    date TEXT,
    comment TEXT,
    style TEXT,
    leadStyle TEXT,
    pitches INTEGER,
    text TEXT,
    createdAt TEXT,
    updatedAt TEXT,
    user_id INTEGER,
    user_name TEXT,
    FOREIGN KEY(route_id) REFERENCES routes(id)
  );
  `);
}

// Prepared statements used throughout the scraper.  They use the
// `OR REPLACE` strategy so the script can be re-run and update existing rows.

export const insertArea = db.prepare(`
INSERT OR REPLACE INTO areas (id, title, parent_id, package_id, breadcrumbs, is_leaf, url, lat, lon, radius, summary, rating, popularity, depth, submitted_by)
VALUES (@id, @title, @parent_id, @package_id, @breadcrumbs, @is_leaf, @url, @lat, @lon, @radius, @summary, @rating, @popularity, @depth, @submitted_by)`);


export const insertRoute = db.prepare(`
INSERT OR REPLACE INTO routes (id, area_id, title, package_id, url, difficulty, pitches, height_feet, types, summary, rating, popularity, thumbnail, first_ascent, submitted_by)
VALUES (@id, @area_id, @title, @package_id, @url, @difficulty, @pitches, @height_feet, @types, @summary, @rating, @popularity, @thumbnail, @first_ascent, @submitted_by)`);

export const insertSection = db.prepare(`
INSERT INTO sections (parent_type, parent_id, title, html) VALUES (@parent_type, @parent_id, @title, @html)`);

export const insertTick = db.prepare(`
INSERT OR REPLACE INTO ticks (id, route_id, date, comment, style, leadStyle, pitches, text, createdAt, updatedAt, user_id, user_name)
VALUES (@id, @route_id, @date, @comment, @style, @leadStyle, @pitches, @text, @createdAt, @updatedAt, @user_id, @user_name)`);

// Simple existence checks used to avoid re-downloading data on subsequent runs.
export const selectArea = db.prepare('SELECT 1 FROM areas WHERE id = ?');
export const selectRoute = db.prepare('SELECT 1 FROM routes WHERE id = ?');

