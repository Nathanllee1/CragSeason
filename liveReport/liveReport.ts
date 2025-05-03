import { loadJsonFromFile, writeJsonToFile } from "../scraper/scraper";
import {MPClimb, mp } from "../scraper/scraperTypes";

function findArea(data: mp, areaId: string): undefined | mp {
    if (!data.loaded) {
        return
    }

    if (data.url === areaId) {
        return data
    }

    if (data.routeType === "climb") {
        return undefined;
    }

    for (const area of data.areas) {
        const found = findArea(area, areaId)

        if (found) {
            return found
        }
    }
}

function getListOfClimbs(data: mp, minTicks=10): MPClimb[] {
    if (!data.loaded) {
        return []
    }

    if (data.routeType === "climb") {

        if (data.ticks.length > minTicks) {
            return [data]
        }

        return []
    }

    let climbs: MPClimb[] = []
    for (const area of data.areas) {
        climbs = climbs.concat(getListOfClimbs(area))
    }

    return climbs;
}

async function getLiveReport(areaId: string, dataFile: string) {
    const data = await loadJsonFromFile(dataFile);

    const area = findArea(data, areaId)

    if (!area) {
        console.log("Area not found")
        return
    }

    const climbs = getListOfClimbs(area, 20)
    console.log(climbs.length)

    let recentTicks = []

    for (const climb of climbs) {
        const routeId = climb.url.split("/").at(-2)

        const url = `https://www.mountainproject.com/api/v2/routes/${routeId}/ticks?per_page=250&page=1`

        const res = await fetch(url)

        if (!res.ok) {
            console.log("Failed to get climb page")
            continue
        }

        const ticks = await res.json()

       console.log("Scraping", climb.name, "found", ticks.data.length, "ticks")


        for (const tick of ticks.data) {
            // if tick was in last 4 months
            if (new Date(tick.date) > new Date(Date.now() - 1000 * 60 * 60 * 24 * 30 * 1)) {
                recentTicks.push(tick)
            }
        }

        await sleep(100)


    }

    console.log("Found", recentTicks.length, "recent ticks")

    await writeJsonToFile("recentTicks.json", recentTicks)
}

async function sleep(ms: number) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve(ms)
        }, ms)

    })
}

getLiveReport("https://www.mountainproject.com/area/114347347/bowmanemeralds", "../data/california.json")