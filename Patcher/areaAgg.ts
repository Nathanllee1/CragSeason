import { appendFile, readdir } from "fs/promises"
import { loadJsonFromFile } from "../scraper/scraper"
import type { mp } from "../scraper/scraperTypes"

async function getListOfAreas(data: mp) {

    if (!data.loaded) {
        return
    }

    if (data.routeType === "area") {
        const id = data.url.split("/").slice(-2).join("/")
        await appendFile("areas.txt", `${id}\n`)

        for (const children of data.areas) {
            await getListOfAreas(children)
        }

    }

    return

}

async function processFile(dataPath: string) {
    const data = await loadJsonFromFile(`../data/${dataPath}`)

    return getListOfAreas(data);
}

async function main() {
    const files = await readdir("../data")

    // await appendFile(outputPath, `{"type": "FeatureCollection", "features":[`)
    let features: any[] = []
    for (const file of files) {
        console.log("Processing", file)

        processFile(file)
    }
}


main()