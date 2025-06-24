/*
  climb_guide_agent.ts – flexible ReAct‑style climbing‑guide agent (TypeScript)
  ---------------------------------------------------------------------------
  * One “Planner” agent thinks, calls any tool any time, and replies.
  * Tools are orthogonal and accept many optional filters.
  * Tracing works via withTrace() just like the Python SDK.
*/

import "dotenv/config";
import { createClient } from "@libsql/client";
import { Agent, tool, run, handoff, type RunStreamEvent } from "@openai/agents";
import { z } from "zod";
import { RECOMMENDED_PROMPT_PREFIX } from '@openai/agents-core/extensions';

// DB client
const turso = createClient({
  url: "http://127.0.0.1:8080" // process.env.TURSO_DATABASE_URL!,
  // authToken: process.env.TURSO_AUTH_TOKEN,
});

/* helper: execute query and return rows */
async function all(sql: string, params: unknown[] = []) {
  const { rows } = await turso.execute(sql, params);
  return rows as Record<string, unknown>[];
}

/* ───────────────────────────────────────────────
   TOOL DEFINITIONS
───────────────────────────────────────────────*/

function searchAreas() {
  const paramsSchema = z.object({
    name: z.string(),
    limit: z.number().int().min(1),
  });

  return tool({
    name: "search_areas",
    description:
      "Find areas whose title roughly matches name, ordered by popularity.",
    parameters: paramsSchema,
    execute: async ({ name, limit }) => {
      return await all(
        `SELECT a.id, a.title, a.url, a.lat, a.lon, a.popularity, a.breadcrumbs
         FROM areas_fts
         JOIN areas a ON a.id = areas_fts.rowid
         WHERE areas_fts MATCH ?
         ORDER BY bm25(areas_fts) ASC, a.popularity ASC
         LIMIT ?;`,
        [name, limit]
      );
    },
  });
}


export function searchRoutes() {
  const paramsSchema = z.object({
    name: z.string(),
    limit: z.number().int().min(1),
  });

  return tool({
    name: "search_routes",
    description:
      "Find climbs (routes) whose title roughly matches name, ordered by popularity.",
    parameters: paramsSchema,
    execute: async ({ name, limit }) => {
      return await all(
        `SELECT
           r.id,
           r.area_id,
           r.title,
           r.url,
           r.difficulty,
           r.popularity
         FROM route_names_fts
         JOIN routes r ON r.id = route_names_fts.rowid
         WHERE route_names_fts MATCH ?
         ORDER BY bm25(route_names_fts) ASC, r.popularity DESC
         LIMIT ?;`,
        [name, limit],
      );
    },
  });
}

function searchBreadcrumbs() {
  const paramsSchema = z.object({
    tokens: z.array(z.string()),
    limit: z.number().int().min(1),
  });

  return tool({
    name: "search_breadcrumbs",
    description:
      "Find areas whose breadcrumb path contains all tokens (case‑insensitive).",
    parameters: paramsSchema,
    execute: async ({ tokens, limit }) => {
      if (!tokens.length) return [];
      const words = tokens
        .flatMap((t) => t.match(/\\w+/g) ?? [])
        .join(" AND ");
      return await all(
        `SELECT a.id, a.title, a.url, a.lat, a.lon, a.popularity, a.breadcrumbs
           FROM area_breadcrumbs_fts f
           JOIN areas a ON a.id = f.area_id
          WHERE area_breadcrumbs_fts MATCH ?
          ORDER BY rank, a.popularity ASC
          LIMIT ?;`,
        [words, limit]
      );
    },
  });
}

function searchAndRankRoutes() {
  const paramsSchema = z.object({
    areaIds: z.array(z.number().int()).nullable(),
    grade: z.string().nullable(),
    limit: z.number().int().min(1),
  });

  return tool({
    name: "search_and_rank_routes",
    description:
      "Return popular routes filtered by grade within the given areas (recursive).",
    parameters: paramsSchema,
    execute: async ({ areaIds, grade, limit }) => {
      const params: unknown[] = [];
      let cte = "";
      let where = "";

      if (areaIds && areaIds.length) {
        const placeholders = areaIds.map(() => "?").join(",");
        params.push(...areaIds);
        cte =
          `WITH RECURSIVE subareas(id) AS (` +
          ` SELECT id FROM areas WHERE id IN (${placeholders})` +
          ` UNION ALL SELECT a.id FROM areas a JOIN subareas s ON a.parent_id = s.id)`;
        where = "WHERE r.area_id IN (SELECT id FROM subareas)";
      }

      if (grade) {
        where += where ? " AND" : "WHERE";
        where += " r.difficulty = ?";
        params.push(grade);
      }

      params.push(limit);

      return await all(
        `${cte}
         SELECT r.id, r.title, r.area_id, r.url,
                r.difficulty, r.pitches, r.rating, r.popularity, r.types, r.thumbnail
           FROM routes r
           ${where}
           ORDER BY r.popularity DESC
           LIMIT ?;`,
        params
      );
    },
  });
}

function bm25SearchDescriptions() {
  const Params = z.object({
    query: z.string(),
    areaIds: z.array(z.number().int()).min(1),
    limit: z.number().int().min(1),
    kinds: z.array(z.enum(["area", "route"]).nullable()), // default: both
  });

  return tool({
    name: "search_descriptions_bm25",
    description: `
BM25-ranked full-text search on idx_descriptions_fts.

• areaIds – root areas; search recurses through all descendants.
• kinds   – restrict to ["area"], ["route"], or both (default).`,
    parameters: Params,
    execute: async (p) => {
      /* ───── 1) build the recursive area set ───── */
      const placeholders = p.areaIds.map(() => "?").join(",");
      const cte = `
        WITH RECURSIVE subareas(id) AS (
          SELECT id FROM areas WHERE id IN (${placeholders})
          UNION ALL
          SELECT a.id FROM areas a
          JOIN subareas s ON a.parent_id = s.id
        )`;

      /* ───── 2) optional kind filter ───── */
      let kindSql = "";
      const sqlParams: unknown[] = [...p.areaIds, p.query]; // ids first, then MATCH
      if (p.kinds?.length === 1) {
        kindSql = "AND d.parent_type = ?";
        sqlParams.push(p.kinds[0]);
      }

      /* ───── 3) main query ───── */
      sqlParams.push(p.limit);
      const rows = await all(
        `
        ${cte}
        SELECT d.parent_type,
               d.parent_id,
               d.description,
               bm25(idx_descriptions_fts) AS score
          FROM idx_descriptions_fts
          JOIN descriptions d       ON d.rowid = idx_descriptions_fts.rowid
          /* link ‘area’ rows to their own id,
             link ‘route’ rows to the area they belong to */
          LEFT JOIN areas  a ON d.parent_type = 'area'  AND a.id = d.parent_id
          LEFT JOIN routes r ON d.parent_type = 'route' AND r.id = d.parent_id
          /* target set: any description whose *area context*
             is in the recursive subareas list */
         WHERE idx_descriptions_fts MATCH ?
           AND (
                (d.parent_type = 'area'  AND d.parent_id IN (SELECT id FROM subareas))
             OR (d.parent_type = 'route' AND r.area_id  IN (SELECT id FROM subareas))
           )
           ${kindSql}
         ORDER BY score                /* lower BM25 ⇒ better */
         LIMIT ?;`,
        sqlParams
      );

      return rows;
    },
  });
}

function getArea() {
  const paramsSchema = z.object({
    id: z.number().int(),
  });

  return tool({
    name: "get_area",
    description: "Return the markdown description for an area",
    parameters: paramsSchema,
    execute: async ({ id }) => {
      const { rows } = await turso.execute(
        `SELECT description FROM descriptions WHERE parent_type = ? AND parent_id = ?`,
        ["area", id]
      );
      return (rows[0] as any)?.description ?? "";
    },
  });
}

function getRoute() {
  const paramsSchema = z.object({
    id: z.number().int(),
  });

  return tool({
    name: "get_route",
    description: "Return the markdown description for a route",
    parameters: paramsSchema,
    execute: async ({ id }) => {
      const { rows } = await turso.execute(
        `SELECT description FROM descriptions WHERE parent_type = ? AND parent_id = ?`,
        ["route", id]
      );
      return (rows[0] as any)?.description ?? "";
    },
  });
}
/* ───────────────────────────────────────────────
   AGENT
───────────────────────────────────────────────*/



export const planner = new Agent({
  name: "ClimbingGuidePlanner",
  instructions: `
  ${RECOMMENDED_PROMPT_PREFIX}
You are an expert climbing guide writer.

If someone asks you something unrelated to finding information about climbing, just nicely say you can't.
Your data is sourced from mountain project.

**Workflow (ReAct style)**
Think → decide → CALL_TOOL → observe → repeat.
Call search_areas, search_and_rank_routes, search_breadcrumbs, and search_routes at most twice unless absolutely necessary. To narrow down specific
areas or climbs call bm25SearchDescriptions which does a text search on climbs / areas / both within a broader area. If you search for something and 
it doesn't come up, it might be since it's phrased slightly differently, find unique keywords that might help you narrow down the climb or area.
If information is missing or ambiguous, ask the user a follow-up.

If you feel you cannot answer a user's question with the data you found, do not try to come up with missing data, just say there was an
issue fetching it. However, keep going until around 9 turns if you can't find anything

Fetch information about the area the user wanted, so if the user wanted info on red rocks, you would get full info with getArea.

Once you have enough information to answer the user's question, you're going to write a helpful answer. Start with a quick blurb about the overall climbing area, maybe a sentence or two
using the tool getArea (THIS IS REQUIRED).
Always fetch route descriptions for the selected routes using getRoute and write a helpful answer (bold route names, grade, ★rating/5, pitches, etc) this MUST be in markdown
Use headings to structure the data. Avoid using bullet points, bold the title of field like **Pitches:** 4
Write a concise summary from the route description, but do not use the same wording. Feel free to embed thumbnail images in.


**After you answer, include a “Sources” section** listing each URL you pulled data from (one per line, in markdown link format).  


After that, do **not** call any more tools.

Never write SQL directly.
`,
  tools: [
    searchAreas(),
    searchBreadcrumbs(),
    searchAndRankRoutes(),
    getArea(),
    getRoute(),
    bm25SearchDescriptions(),
    searchRoutes(),
  ],
  model: "gpt-4.1-mini",
});


/* Convenience */
export async function answerQuestion(prompt: string) {
  const { finalOutput } = await run(planner, prompt, {
    stream: true
  });
  return finalOutput;
}

export async function textStream(prompt: string): Promise<ReadableStream<string>> {
  const streamed = await run(planner, prompt, { stream: true });
  return streamed.toTextStream(); // web‑standard ReadableStream<string>
}

/* CLI demo */
if (import.meta.url === `file://${process.argv[1]}` && process.argv[2]) {
  answerQuestion(process.argv.slice(2).join(" ")).then(console.log);
}
