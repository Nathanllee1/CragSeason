import Database from "better-sqlite3";

export const db = new Database("climbing.db");

// Function to initialize the database
export function initDB() {
    db.exec(`
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS areas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            url TEXT UNIQUE NOT NULL,
            parent_id INTEGER REFERENCES areas(id) ON DELETE CASCADE,
            latitude REAL,
            longitude REAL
        );

        CREATE TABLE IF NOT EXISTS climbs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            url TEXT UNIQUE NOT NULL,
            area_id INTEGER REFERENCES areas(id) ON DELETE CASCADE,
            ticks TEXT DEFAULT '[]' -- JSON array of tick dates
        );

        -- Add an index on 'name' to improve search performance
        CREATE INDEX IF NOT EXISTS idx_areas_name ON areas(name);
        CREATE INDEX IF NOT EXISTS idx_climbs_name ON climbs(name);
        CREATE INDEX IF NOT EXISTS idx_areas_parent ON areas(parent_id);
        CREATE INDEX IF NOT EXISTS idx_climbs_area ON climbs(area_id);


    `);
    console.log("Database initialized with indexes.");
}

// Function to insert an area
export function insertArea(id: number, name: string, latitude: number | null, longitude: number | null, parentId: number | null) {
    const stmt = db.prepare(`
        INSERT INTO areas (id, name, latitude, longitude, parent_id)
        VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(id, name, latitude, longitude, parentId);
}

// Function to insert a climb
export function insertClimb(id: number, name: string, areaId: number) {
    const stmt = db.prepare(`
        INSERT INTO climbs (id, name, area_id, ticks)
        VALUES (?, ?, ?, '[]')
    `);
    stmt.run(id, name, areaId);
}

// Function to add a tick to a climb
export function addTick(climbId: number, date: string) {
    const stmt = db.prepare(`
        UPDATE climbs 
        SET ticks = json_insert(ticks, '$[#]', ?) 
        WHERE id = ?
    `);
    stmt.run(date, climbId);
}

// Function to get all climbs in an area
export function getClimbsByArea(areaId: number) {
    const stmt = db.prepare(`
        SELECT * FROM climbs WHERE area_id = ?
    `);
    return stmt.all(areaId);
}

// Function to get climbs with their tick counts
export function getClimbsWithTickCounts() {
    const stmt = db.prepare(`
        SELECT name, json_array_length(ticks) AS tick_count FROM climbs ORDER BY tick_count DESC
    `);
    return stmt.all();
}

// check if area exists by id
export function areaExists(areaId: number) {
    const stmt = db.prepare(`
        SELECT id FROM areas WHERE id = ?
    `);
    return stmt.get(areaId);
}

// check if climb exists by id
export function climbExists(climbId: number) {
    const stmt = db.prepare(`
        SELECT id FROM climbs WHERE id = ?
    `);
    return stmt.get(climbId);
}


// Initialize the database when this script is run
initDB();
