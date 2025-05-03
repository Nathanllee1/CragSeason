import { readdir } from "fs/promises";
import { loadJsonFromFile } from "../scraper/scraper";
import { mp } from "../scraper/scraperTypes";
import path from "path";

function parseTree(data: mp): number {

    if (!data.loaded) {
        return 0
    }

    if (data.routeType === "climb") {
        return 1
    }

    return 1 + data.areas.reduce((sum, area) => {
        return sum + parseTree(area)
    }, 0)

}

function sumTicks(data: mp): number {

    if (!data.loaded) {
        return 0
    }

    if (data.routeType === "climb") {
        return data.ticks.length
    }

    return data.areas.reduce((sum, area) => {
        return sum + sumTicks(area)
    }, 0)

}

async function countPages(file: string) {
    const data = await loadJsonFromFile(file)

    return sumTicks(data)

}

async function main() {
    const files = await readdir("data")

    

    const sums = await Promise.all(files.map(file => countPages(path.join("data", file))))

    const total = sums.reduce((acc, curr) => curr + acc)

    console.log("total entries:", total)
}

main()