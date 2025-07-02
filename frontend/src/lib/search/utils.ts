import { createClient } from "@libsql/client/web";

const GRADE_RE = /^(?:5\.\d{1,2}[abcd]?|5\.\d{1,2}|V\d{1,2}[+-]?|WI\d{1,2}|AI\d{1,2}|M\d{1,2}|C\d{1,2}|PG13|PG-?13|R|X)$/i;


export function sanitizeFtsQuery(q: string | null): string {
  if (!q) return "";
  return q
    .split(/\s+/)
    .filter(Boolean)
    .filter((tok) => !GRADE_RE.test(tok))
    .map((tok) =>
      /[^A-Za-z0-9]/.test(tok)
        ? `"${tok.replace(/"/g, '""')}"`
        : tok,
    )
    .join(" ");
}


// DB client
const turso = createClient({

  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});


/* helper: execute query and return rows */
export async function all(sql: string, params: unknown[] = []) {
  const { rows } = await turso.execute(sql, params);
  return rows as Record<string, unknown>[];
}