import { tool } from "@openai/agents";
import { z } from "zod";
import { scoreRangeForGrade } from "./gradeLib";
import { all } from "./utils";

const ClimbTypes = z.enum(["trad", "sport", "tr", "boulder", "ice"]);

const Filters = z.object({
    areaId: z.number().int(),

    gradeFilter: z.object({
        climbType: ClimbTypes,
        minGrade: z.string().nullable(),
        maxGrade: z.string().nullable(),
    }),
    morePitchesThan: z.number().int().nullable()
})

type FilterType = z.infer<typeof Filters>

function getWhereFilters(p: FilterType): {
    whereSql: string,
    params: unknown[]
} {

    const where: string[] = [];
    const params: unknown[] = []

    if (p.gradeFilter) {
        const style = p.gradeFilter.climbType;

        where.push(`r.${style} = 1`)

        if (p.gradeFilter.minGrade) {
            const [minS] = scoreRangeForGrade(p.gradeFilter.minGrade, style);

            where.push("r.score > ?")
            params.push(minS)
        }

        if (p.gradeFilter && p.gradeFilter.maxGrade) {
            const [, maxS] = scoreRangeForGrade(p.gradeFilter.maxGrade, style);

            where.push("r.score < ?")
            params.push(maxS)
        }
    }

    if (p.morePitchesThan) {
        where.push("r.pitches > ?")
        params.push(p.morePitchesThan)
    }

    const whereSql = where.length ? `AND ${where.join(" AND ")}` : "";

    return {
        whereSql,
        params
    }

}

export function getClimbsInArea() {
    return tool({
        name: "get_climbs_in_area",
        description: `Gets all climbs in an area sorted by popularity
         and filtered by passed in features`,
        parameters: Filters,
        async execute(p) {
            const { whereSql, params } = getWhereFilters(p)

            params.unshift(p.areaId);

            const sql = `
                WITH children as (SELECT *
                    FROM area_closure
                    WHERE ancestor_id = ?
                )

                SELECT r.title, r.difficulty, r.id, r.popularity * (r.rating / 5.0)
                                AS score
                FROM children
                JOIN descriptions d ON d.parent_id = children.descendant_id
                LEFT JOIN routes r ON r.area_id = d.parent_id
                WHERE 1 = 1
                ${whereSql}
                ORDER BY score DESC
                LIMIT 10
            `

            return all(sql, params)

        }
    })
}

export function getClimbsInAreaByKeyword() {

    return tool({
        name: "get_climbs_by_keyword",
        description: `Get all climbs in an area and filter by keyword
            Keyword must be a phrase in quotes like 'highball' and can include
            boolean queries like 'highball AND slab' or 'highball OR slab' or
            phrases like '"highball problem"'        
        `,
        parameters: z.object({
            keyword: z.string(),
            filters: Filters
        }),
        async execute(p) {
            const { whereSql, params } = getWhereFilters(p.filters)
            params.unshift(p.keyword)
            params.unshift(p.filters.areaId);

            const sql = `
                WITH children as (SELECT *
                    FROM area_closure
                    WHERE ancestor_id = ?
                )

                SELECT r.title, r.difficulty, r.id, bm25(idx_descriptions_fts) AS rank, 
                    r.popularity, r.rating, r.popularity * (r.rating / 5.0) / (ABS(bm25(idx_descriptions_fts)) + 1)
                    AS score
                FROM children
                JOIN descriptions d ON d.parent_id = children.descendant_id
                JOIN   idx_descriptions_fts
                    ON idx_descriptions_fts.rowid = d.id
                    AND idx_descriptions_fts MATCH ?
                LEFT JOIN routes r ON r.area_id = d.parent_id
                WHERE 1 = 1
                ${whereSql}
                ORDER BY score DESC
                LIMIT 10
            `

            console.log(sql)

            return all(sql, params)
        }
    })

}