import { GeolibInputCoordinates } from "geolib/es/types";
import { loadJsonFromFile, writeJsonToFile } from "../scraper/scraper"
import { mp } from "../scraper/scraperTypes";
import { getDistance } from 'geolib';
import { appendFile, readdir, writeFile } from "fs/promises";
import { join } from "path";

export type mpCondensed = {
    url: string,
    monthTicks: number[],
    totalTicks: number,
    seasonMetric: number,
    coordinates: [number, number],
    name: string
}


// Custom month weights for calculating the season metric
const customMonthWeights = [
    0.1,
    0.15,
    0.25,
    0.35,
    0.5,
    0.65,
    0.8,
    0.8,
    0.7,
    0.6,
    0.4,
    0.2
]

const meterThreshold = 10000
type location = { latitude: number, longitude: number }

const childrenCloseBy = (parentLocation: GeolibInputCoordinates, childLocations: GeolibInputCoordinates[]) => {

    for (const childLocation of childLocations) {
        if (getDistance(childLocation, parentLocation) > meterThreshold) {
            return false
        }
    }
    return true

}

const getTicks = (data: mp) => {

    if (!data.loaded) {
        throw Error("Data not fully loaded")
    }

    let ticks: Date[] = []

    if (data.routeType === "area") {
        data.areas.forEach(area => {
            ticks.push(...getTicks(area))
        })

        return ticks
    }

    ticks = data.ticks.map(tick => new Date(tick))

    return ticks

}

function calculateSeasonMetric(ticksByMonth: number[]): number {
    const totalTicks = ticksByMonth.reduce((accumulator, curVal) => accumulator + curVal)

    let weightedSum = 0;

    ticksByMonth.forEach((monthCount, index) => {
        weightedSum += customMonthWeights[index] * monthCount
    })

    return parseFloat((weightedSum / totalTicks).toFixed(2))
}

const extractAreas = (data: mp): mpCondensed[] => {

    if (!data.loaded || data.routeType === "climb") {
        throw Error(`Can't process climbs: ${JSON.stringify(data)}`)
    }

    const childcoordinates = data.areas.map(area => {
        if (!area.loaded || area.routeType === "climb") {
            return undefined
        }

        return area.coordinates
    }).filter(area => area) as GeolibInputCoordinates[]

    if (childrenCloseBy(data.coordinates as GeolibInputCoordinates, childcoordinates)) {

        const tickList = getTicks(data)

        if (tickList.length <= 10) {
            return []
        }

        let monthTicks: number[] = new Array(12).fill(0)

        tickList.forEach(tick => {
            monthTicks[tick.getMonth()]++;
        })

        return [{
            monthTicks,
            totalTicks: tickList.length,
            url: data.url.split("/").slice(-2).join("/"),
            seasonMetric: calculateSeasonMetric(monthTicks),
            coordinates: data.coordinates,
            name: data.name
        }]
    }

    const areas: mpCondensed[] = []

    for (const area of data.areas) {
        areas.push(...extractAreas(area))
    }

    return areas

}

function generateGeoJSONFeatures(climbingAreas: mpCondensed[]): any {
    const features: any[] = [];

    climbingAreas.forEach(area => {

        const feature = {
            type: "Feature",
            geometry: {
                type: "Point",
                coordinates: area.coordinates.reverse()
            },
            properties: area
        };

        features.push(feature);
    });

    return features;
}

const outputPath = "frontend/static/all.geojson"

const processFile = async (dataPath: string) => {
    const data = await loadJsonFromFile(dataPath);

    try {
        const areas = extractAreas(data);

        const geojson = generateGeoJSONFeatures(areas);
        return geojson
    } catch(e) {
        console.log(e, dataPath)
        return[]
    }
    
}

async function main() {
    const files = await readdir("data")

    // await appendFile(outputPath, `{"type": "FeatureCollection", "features":[`)
    let features: any[] = []
    for (const file of files) {
        features.push(await processFile(join("data", file)))
    }
    


    
    /*
    let features = await Promise.all(files.map(async file => {
        // geojson.features = geojson.features.concat(await processFile(join("data", file)))

        return await processFile(join("data", file))

        // console.log(geojson.features.length)

    }))
    */

    // console.log(features.flat())
    let geojson = {"type": "FeatureCollection", features: features.flat()}

    await writeJsonToFile(outputPath, geojson, false)
    //await appendFile(outputPath, "]}")
}

main()