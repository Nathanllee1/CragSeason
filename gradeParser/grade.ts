// generate-scores.ts  (ES-module)  ────────────────
import path from 'node:path';
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';

import {
    YosemiteDecimal,
    VScale,
    WI,
    // AlpineIce etc. are available too.
} from '@openbeta/sandbag';                       // :contentReference[oaicite:0]{index=0}

type RouteRow = {
    id: number;
    difficulty: string;
    ice: number;
    boulder: number;
    tr: number;
    sport: number;
    trad: number;
};

let fails = 0;

const DB_FILE = path.resolve('APIScraper/mountainproject.db');
const BATCH_LOG_EVERY = 5_000; // rows

// ──────────────────────────────────────────────────
main().catch(fatal);

async function main(): Promise<void> {
    const db = await openDb();


    const rows = await db.all<RouteRow[]>(
        `SELECT id, difficulty, ice, boulder, tr, sport, trad FROM routes`
    );

    let processed = 0;
    for (const r of rows) {
        const danger = extractDanger(r.difficulty);
        const clean = stripDanger(r.difficulty).split(" ")[0];

        const score = gradeToScore(clean, r);
        
        await db.run(
          `UPDATE routes SET score = ?, danger = ? WHERE id = ?`,
          score,
          danger,
          r.id
        );
        

        processed++;
        if (processed % BATCH_LOG_EVERY === 0) {
            console.log(`✓ ${processed} / ${rows.length}`);
        }
    }

    console.log(`Found ${fails} fails`)

    console.log(`Done – ${processed} routes scored.`);
    await db.close();
}

// ────────── helpers ───────────────────────────────
async function openDb(): Promise<Database> {
    return open({
        filename: DB_FILE,
        driver: sqlite3.Database,
    });
}


function extractDanger(d: string): string | null {
    const m = d.match(/\b(PG\-?13|R|X)\b/i);
    return m ? m[1].toUpperCase() : null;
}

function stripDanger(d: string): string {
    return d.replace(/\b(PG\-?13|R|X)\b/gi, '').trim();
}

function avg([lo, hi]: number[]): number {
    return (lo + hi) / 2;
}

function gradeToScore(grade: string, style: RouteRow): number {
    const choose = () => {
        if (style.ice) {

            // remove +
            const iceGrade = grade.replace("+", "").replace("-", "")

            return WI.getScore(iceGrade);
        }
        if (style.boulder) return VScale.getScore(grade);
        // default to roped climbing systems (YDS covers sport, trad, TR)
        return YosemiteDecimal.getScore(grade);
    };

    const score = choose();
    if (!score?.length) {
        fails++
        return 0
    };

    return avg(score);
}

function fatal(err: unknown): never {
    console.error(err);
    process.exit(1);
}
