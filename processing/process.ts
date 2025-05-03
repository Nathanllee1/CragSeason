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
    name: string,
    scaling: number[]
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

export const childrenCloseBy = (parentLocation: GeolibInputCoordinates, childLocations: GeolibInputCoordinates[], meterThreshold: number) => {

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

export function computePointSize(
    monthTicks: number[],
    currentMonth: number,
    monthScaleFactor: number = 10,
    totalTicksScaleFactor: number = 1
  ): number {
    // Get the ticks for the current month
    const currentMonthTicks = monthTicks[currentMonth];
  
    // Calculate the total ticks over all months
    const totalTicks = monthTicks.reduce((acc, ticks) => acc + ticks, 0);
  
    // Compute the proportion of ticks for the current month relative to the total
    const monthProportion = currentMonthTicks / totalTicks;
  
    // Scale the size value based on the month proportion and the total number of ticks
    const pointSize =
      monthProportion * monthScaleFactor + totalTicks * totalTicksScaleFactor;
  
    // Ensure a minimum size to make sure points are visible even if proportion is low
    return parseFloat((Math.max(pointSize, 1)).toFixed(2));  // Min size of 1 to ensure visibility
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

    if (childrenCloseBy(data.coordinates as GeolibInputCoordinates, childcoordinates, meterThreshold)) {

        const tickList = getTicks(data)

        if (tickList.length <= 10) {
            return []
        }

        let monthTicks: number[] = new Array(12).fill(0)

        tickList.forEach(tick => {
            monthTicks[tick.getMonth()]++;
        })

        let scaling = []
        for (let i = 0; i < 12; i++) {
            scaling.push(computePointSize(monthTicks, i))
        }

        return [{
            monthTicks,
            totalTicks: tickList.length,
            url: data.url.split("/").slice(-2).join("/"),
            seasonMetric: calculateSeasonMetric(monthTicks),
            coordinates: data.coordinates,
            name: data.name,
            scaling
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

const outputPath = "frontend/static/all2.geojson"

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
        console.log("Processing", file)
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