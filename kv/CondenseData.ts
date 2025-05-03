import { loadJsonFromFile, writeJsonToFile } from "../scraper/scraper"
import { mp, MPClimb } from "../scraper/scraperTypes";
import { GeolibInputCoordinates } from "geolib/es/types";
import { getDistance } from 'geolib';
import { appendFile, readdir, writeFile } from "fs/promises";
import { ContentRangeStore } from "./MakeKv";

const meterThreshold = 10000
const tickThreshold = 20

type rootAreaInfo = {
    id: string,
    ticks: string[],
    name: string,
    coordinates: [number, number]
}

type AreaPayload = {
    name: string;          
    areas: rootAreaInfo[];
    coordinates: [number, number]
};

type areaInfo = Record<string, AreaPayload>;

export const childrenCloseBy = (parentLocation: GeolibInputCoordinates, childLocations: GeolibInputCoordinates[], meterThreshold: number) => {

    for (const childLocation of childLocations) {
        if (getDistance(childLocation, parentLocation) > meterThreshold) {
            return false
        }
    }
    return true

}


function makeAreaInfo(data: mp): rootAreaInfo[] {

    if (!data.loaded) {
        throw Error("Data not fully loaded")
    }

    if (data.routeType === "climb") {
        return []
    }

    // if "petal" node, so area with climbs
    if (data.routeType === "area" && data.areas.length > 0
        && data.areas[0].loaded && data.areas[0].routeType === "climb") {

        console.log("Found petal node", data.url)
        let climbs = data.areas.filter(area => area.loaded && area.routeType === "climb") as MPClimb[]

        climbs = climbs.filter(climb => climb.ticks.length > tickThreshold)

        const sortedClimbs = climbs.sort((a, b) => b.ticks.length - a.ticks.length);
        const topClimbs = sortedClimbs.slice(0, 50)

        return topClimbs.map(climb => ({
            id: climb.url.split("/").slice(-2, -1).join("/"),
            ticks: climb.ticks.map(tick => tick.split("T")[0]),
            name: climb.name,
            coordinates: data.coordinates as [number, number]
        }));

    }

    return data.areas.map(area => {
        if (area.loaded && area.routeType === "area") {
            return makeAreaInfo(area)
        }

        return []
    }).flat()

}

const extractAreas = (data: mp): areaInfo[] => {

    if (!data.loaded || data.routeType === "climb") {
        throw Error(`Can't process climbs: ${JSON.stringify(data)}`)
    }

    const childcoordinates = data.areas.map(area => {
        if (!area.loaded || area.routeType === "climb") {
            return undefined
        }

        return area.coordinates
    }).filter(area => area) as GeolibInputCoordinates[]

    if (childrenCloseBy(data.coordinates as GeolibInputCoordinates, childcoordinates, meterThreshold)) {
        const areaId = data.url.split("/").slice(-2, -1).join("/")

        const payload: AreaPayload = {
            name: data.name,          
            areas: makeAreaInfo(data),
            coordinates: data.coordinates
        };

        return [{ [areaId]: payload }];
    }

    const areas: areaInfo[] = []
    for (const area of data.areas) {
        areas.push(...extractAreas(area))
    }
    return areas

}

async function main() {
    const files = await readdir("data")

    const store = new ContentRangeStore("index.json", "data.kv")
    await store.init();
    // await appendFile(outputPath, `{"type": "FeatureCollection", "features":[`)
    let features: any[] = []
    for (const file of files) {
        console.log("Processing", file)
        const data = await loadJsonFromFile(`data/${file}`) as mp

        const areas = extractAreas(data)

        console.log("Found areas", areas.length)


        for (const area of areas) {

            const areaId = Object.keys(area)[0]

            const areaData = area[areaId];
            await store.append(areaId, Buffer.from(JSON.stringify(areaData)))
        }
    }

    await store.writeIndex();


    console.log("Done!")



}

main()