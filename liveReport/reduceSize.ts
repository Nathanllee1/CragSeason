import { readdir } from "fs/promises"
import { loadJsonFromFile, writeJsonToFile } from "../scraper/scraper"
import { mp } from "../scraper/scraperTypes"


function removeTicks(data: mp): any {

    if (!data.loaded) {
        return data
    }

    if (data.routeType === "climb") {
        return {
            routeType: "climb",
            loaded: true,
            url: data.url,
            name: data.name,
            numTicks: data.ticks.length
        }
    }

    return {
        routeType: "area",
        loaded: true,
        url: data.url,
        name: data.name,
        coordinates: data.coordinates,
        areas: data.areas.map(area => removeTicks(area))
    }

}

async function main() {
    const files = await readdir("../data")

    console.log(files)

    for (const file of files) {
        const data = await loadJsonFromFile(`../data/${file}`)

        const reducedData = removeTicks(data)

        await writeJsonToFile(`data/${file}`, reducedData)  
    }

}

main()