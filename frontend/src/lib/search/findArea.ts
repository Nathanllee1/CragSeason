import { z, ZodAny } from "zod";
import { Agent, tool, run, handoff, type RunStreamEvent } from "@openai/agents";
import { all } from "./utils";
import { RECOMMENDED_PROMPT_PREFIX } from '@openai/agents-core/extensions';


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
         ORDER BY bm25(areas_fts) ASC, a.popularity DESC
         LIMIT ?;`,
                [name, limit]
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
            "Find areas whose breadcrumb path contains all tokens (case-insensitive).",
        parameters: paramsSchema,
        execute: async ({ tokens, limit }) => {
            /* ───── 1) normalise & quote ───── */
            const cleaned = tokens
                .flatMap(t => (t.match(/\p{L}|\p{N}/u) ? [t.trim()] : [])) // keep only tokens that still have letters/numbers
                .filter(Boolean);

            if (cleaned.length === 0) return [];           // nothing to search → avoid empty MATCH ''

            const ftsQuery = cleaned
                .map(t => (/\s/.test(t) ? `"${t}"` : t))      // quote multi-word phrases
                .join(" AND ");

            /* ───── 2) run query ───── */
            return await all(
                `SELECT a.id,
          a.title,
          a.url,
          a.lat,
          a.lon,
          a.popularity,
          a.breadcrumbs,
          bm25(area_breadcrumbs_fts) AS score   -- ← use real table name here
            FROM area_breadcrumbs_fts                -- keep the alias if you like…
            JOIN areas AS a ON a.id = area_breadcrumbs_fts.area_id
            WHERE area_breadcrumbs_fts MATCH ?
        ORDER BY score ASC,                          -- …but not inside bm25()
                  a.popularity ASC
            LIMIT ?;`,
                [ftsQuery, limit]
            );
        },
    });
}

const areaFinder = new Agent({
    name: "AreaFinder",
    instructions: `
        ${RECOMMENDED_PROMPT_PREFIX}
        You find the id of an area with the passed in area name.

        Call search_areas to find relevant areas by name. Find the most relevant one to the user's search.
        This is sorted by popularity and lean on picking the most popular one if ambiguous.

        The area data is hierarchical. To filter by hierarchy, call search_breadcrumbs. This lets you search 
        multiple areas. For example, if a user wants to find Red Rocks in Nevada, you could search
        for ['Nevada', 'Red Rocks']

        Expand abbreviations of state names If you search for something and if it doesn't come up, 
        it might be since it's phrased slightly differently. Find unique keywords that might help you narrow 
        down the climb or area.
    `,
    tools: [
        searchAreas(),
        searchBreadcrumbs()
    ],
    outputType: z.object({
        areaIds: z.array(z.number().nullable())
    }),

})

export const areaFinderTool = areaFinder.asTool({
    toolName: "AreaFinder",
    toolDescription: "Finds the id of an area with a passed in name of the area"
})