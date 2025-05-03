import { readdir } from "fs/promises";
import { mp } from "../scraper/scraperTypes";
import { loadJsonFromFile } from "../scraper/scraper";
import { addTick, areaExists, climbExists, db, insertArea, insertClimb } from "./makeDB";


function traverseTree(data: mp, parentId: number | null = null) {

    if (!data.loaded) {
        return
    }
    const currentId = parseInt(data.url.split("/").slice(-2)[0])


    if (data.routeType === "climb") {
        if (climbExists(currentId)) {

            return
        }

        if (!parentId) {
            throw new Error("Parent ID is required")
        }

        insertClimb(currentId, data.name, parentId)

        for (const tick of data.ticks) {
            addTick(currentId, tick)
        }

        return
    }


    if (areaExists(currentId)) {
        return
    }



    console.log(data.name, data.url, data.coordinates[0], data.coordinates[1], parentId)
    insertArea(currentId, data.name, data.coordinates[0], data.coordinates[1], parentId)

    for (const area of data.areas) {

        traverseTree(area, currentId);
    }
}

async function main() {
    const files = await readdir("../data")

    for (const file of files) {
        console.log(`Processing ${file}`)
        const data = await loadJsonFromFile(`../data/${file}`)

        const transaction = db.transaction(async () => {
            await traverseTree(data)
        });

        transaction();
    }
}

main();