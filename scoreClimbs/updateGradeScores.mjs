// updateGradeScores.mjs
import { createClient } from '@libsql/client'
import { YosemiteDecimal } from '@openbeta/sandbag'  // getScore returns [low, high] :contentReference[oaicite:0]{index=0}

// connect to your libsql database
const client = createClient({
  url: "http://127.0.0.1:8080",
  authToken: ""
})


const BATCH_SIZE = 1000;

async function ensureGradeColumn() {
  const { rows } = await client.execute({ sql: `PRAGMA table_info('routes')` });
  if (!rows.some(col => col.name === 'grade')) {
    await client.execute({ sql: `ALTER TABLE routes ADD COLUMN grade TEXT` });
    console.log('ℹ️  Added `grade` column');
  } else {
    console.log('ℹ️  `grade` column already exists');
  }
}

async function populateGrades() {
  let offset = 0;

  while (true) {
    const { rows } = await client.execute({
      sql: `SELECT id, difficulty
            FROM routes
            LIMIT ? OFFSET ?`,
      args: [BATCH_SIZE, offset],
    });

    if (!rows.length) break;

    for (const row of rows) {
      const id   = row.id;
      const diff = (row.difficulty ?? '').trim();
      const grade = diff.split(' ')[0] || null;

      // each UPDATE is its own transaction in SQLite autocommit mode
      await client.execute({
        sql: `UPDATE routes
              SET grade = ?
              WHERE id = ?`,
        args: [grade, id],
      });
    }

    offset += rows.length;
    console.log(`…processed ${offset} rows`);
  }
}

(async () => {
  try {
    await ensureGradeColumn();
    await populateGrades();
    console.log('✅  All grades extracted!');
  } catch (err) {
    console.error('❌  Something went wrong:', err);
  } finally {
    process.exit(0);
  }
})();