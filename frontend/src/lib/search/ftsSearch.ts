import { tool } from "@openai/agents";
import { z } from "zod";
import { all, sanitizeFtsQuery } from "./utils";
import { scoreRangeForGrade } from "./gradeLib";

const ClimbTypes = z.enum(["trad", "sport", "tr", "boulder", "ice"]);
type ClimbKind = z.infer<typeof ClimbTypes>;

const Params = z.object({
  query: z.string(),                                 // free‑text (FTS)
  areaIds: z.array(z.number().int()).min(1),         // root areas
  limit: z.number().int().min(1).max(5),             // cap results

  kinds: z
    .array(z.enum(["area", "route"]).nullable())
    .nullable()
    .default(null),

  types: z
    .array(ClimbTypes)
    .nullable()
    .default(null),

  minGrade: z.string().nullable().default(null),
  maxGrade: z.string().nullable().default(null),
});

export function bm25SearchDescriptions() {
  return tool({
    name: "search_descriptions_bm25",
    description: `BM25 full‑text search on idx_descriptions_fts.

• query    – leave empty to disable FTS and just filter by area/grades/etc.
• areaIds  – root areas; search recurses through all descendants via area_closure.
• kinds    – ["area"], ["route"], or both (default).
• types    – trad | sport | tr | boulder | ice.
• min/maxGrade – numeric span (e.g. 5.10a–5.11c, V2–V5).`,
    parameters: Params,

    async execute(p) {
      /* 1️⃣ descendant set */
      const placeholders = p.areaIds.map(() => "?").join(",");
      const cte = `WITH children AS (
        SELECT descendant_id FROM area_closure WHERE ancestor_id IN (${placeholders})
      )`;

      /* 2️⃣ dynamic filters */
      const where: string[] = [];
      const params: unknown[] = [...p.areaIds];

      /* optional FTS (sanitise & decide later) */
      const safeQuery = sanitizeFtsQuery(p.query);
      const hasMatch  = safeQuery.length > 0;

      /* kind filter */
      if (p.kinds && p.kinds.filter(Boolean).length === 1) {
        where.push("d.parent_type = ?");
        params.push(p.kinds[0]);
      }

      /* climb‑type flags */
      if (p.types && p.types.length) {
        where.push(`(${p.types.map(t => `r.${t} = 1`).join(" OR ")})`);
      }

      /* grade span */
      if (p.minGrade && p.maxGrade && p.types?.length === 1) {
        const style = p.types[0] as ClimbKind;
        const [minS] = scoreRangeForGrade(p.minGrade, style);
        const [, maxS] = scoreRangeForGrade(p.maxGrade, style);
        where.push("r.score BETWEEN ? AND ?");
        params.push(minS, maxS);
      }

      params.push(p.limit); // LIMIT goes last
      const whereSql = where.length ? `AND ${where.join(" AND ")}` : "";

      /* 3️⃣ assemble SQL in two flavours --------------------------------- */

      /* ——— when we DO have a full‑text query ——— */
      if (hasMatch) {
        const sql = `
          ${cte}

          SELECT d.parent_id,
                 bm25(idx) AS rank,             /* bm25 needs the FTS table */
                 r.difficulty
          FROM   descriptions d
          JOIN   children c ON c.descendant_id = d.parent_id
          JOIN   idx_descriptions_fts idx
                 ON idx.rowid = d.id AND idx MATCH ?
          LEFT  JOIN routes r ON r.id = d.parent_id
          WHERE 1 = 1
          ${whereSql}
          ORDER BY rank, r.popularity DESC, r.rating ASC
          LIMIT ?;`;

        /* order of params:  areaIds…, safeQuery, other filters…, limit */
        const fullParams = [...params];
        fullParams.splice(p.areaIds.length, 0, safeQuery); // insert after areaIds
        console.log(sql)
        return all(sql, fullParams);
      }

      /* ——— no free‑text => skip FTS join entirely ——— */
      const sql = `
        ${cte}

        SELECT d.parent_id,
               NULL AS rank,
               r.difficulty
        FROM   descriptions d
        JOIN   children c ON c.descendant_id = d.parent_id
        LEFT  JOIN routes r ON r.id = d.parent_id
        WHERE 1 = 1
        ${whereSql}
        ORDER BY r.popularity DESC, r.rating ASC
        LIMIT ?;`;

    console.log(sql)

      return all(sql, params);
    },
  });
}
