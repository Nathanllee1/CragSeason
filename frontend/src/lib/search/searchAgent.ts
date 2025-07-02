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
import { scoreRangeForGrade, type ClimbKind } from "./gradeLib";
import { all, sanitizeFtsQuery } from "./utils";
import { areaFinderTool } from "./findArea";
import { bm25SearchDescriptions } from "./ftsSearch";
import { getClimbsInArea, getClimbsInAreaByKeyword } from "./routeSearch";



/* ───────────────────────────────────────────────
   TOOL DEFINITIONS
───────────────────────────────────────────────*/



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

function getComments() {
  const paramsSchema = z.object({
    id: z.number().int(),
    type: z.enum(["areas", "routes"]).default("routes"),
  });

  return tool({
    name: "get_comments",
    description: "Return comments for a route or area.",
    parameters: paramsSchema,
    execute: async ({ id, type }) => {

      const url = `https://www.mountainproject.com/api/v2/${type}/${id}/comments`;

      const res = await fetch(url);

      if (!res.ok) {
        throw new Error(`Failed to fetch comments from ${url}: ${res.statusText}`);
      }

      const data = await res.json();

      return data.slice(0, 3);

    }
  })
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
      const rows = await all(
        `SELECT
          d.description,
          d.parent_id,
          r.url,
          r.title,
          r.summary,
          r.breadcrumbs

        FROM descriptions AS d
        LEFT JOIN areas AS r
              ON d.parent_id = r.id
        WHERE d.parent_id = ?;  
        `,
        [id]
      );
      return (rows[0] as any) ?? "";
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
      const rows = await all(
        `SELECT
          d.description,
          d.parent_id,
          r.url,
          r.title,
          r.difficulty,
          r.pitches,
          r.summary,
          r.rating,
          r.popularity,
          r.thumbnail
        FROM descriptions AS d
        LEFT JOIN routes AS r
              ON d.parent_id = r.id
        WHERE d.parent_id = ?;  
        `,
        [id]
      );
      return (rows[0] as any) ?? "";
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

Sometimes, a user will request for a specific information about an area. Use AreaFinder to get the id of the area for the other tools.
To narrow down all climbs in an area by a short keyword, call get_climbs_by_keyword. Once you get a list of climbs, call getClimb on the relevant
ones to get more information for your report.

If they ask you for details about a specific climb, use searchRoutes and get more details with get_comments.

To get specific information about a given area, call get_climbs_in_area which lets you search climbs within a broader area.
Don't put grades in the text search, use the minGrade / maxGrade functionality. If results don't come up, expand the query by using less filters.
Keep trying and go with the most popular area or route.

If you feel you cannot answer a user's question with the data you found, do not try to come up with missing data, just say there was an
issue fetching it. However, keep going until around 9 turns if you can't find anything

Fetch information about the area the user wanted, so if the user wanted info on red rocks, you would get full info with getArea.

Once you have enough information to answer the user's question, you're going to write a helpful answer. Start with a quick blurb about the overall climbing area, maybe a sentence or two
using the tool getArea (THIS IS REQUIRED). Use the tool getComments to fetch comments about the area or route when the user asks about a specific route or area.
Always fetch route descriptions for the selected routes using getRoute and write a helpful answer (bold route names, grade, ★rating/5, pitches, etc) this MUST be in markdown
Use headings to structure the data. Avoid using bullet points, bold the title of field like **Pitches:** 4
Write a concise summary from the route description, but do not use the same wording. Feel free to embed thumbnail images in.


**After you answer, include a “Sources” section** listing each URL you pulled data from (one per line, in markdown link format).  


After that, do **not** call any more tools.

Never write SQL directly.
`,
  tools: [
    areaFinderTool,
    getArea(),
    getRoute(),
    getClimbsInArea(),
    getClimbsInAreaByKeyword(),
    searchRoutes(),
    getComments()
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
