import { readFile, writeFile } from 'fs/promises';
import { getPage, getAreas, getName, getCoordinates, getTicks, getRoutes } from './getPage';
import { mp } from './scraperTypes';
import { Batcher } from './batcher';


// const root = "https://www.mountainproject.com/area/105708959/california"
// const root = "https://www.mountainproject.com/area/109980899/columbia-bouldering"
// const root = "https://www.mountainproject.com/route/123526834/eskimo-pie"

const scraperBatcher = new Batcher(500)

const maxSessionRequests = 100
let sessionRequestsMade = 0;

function printSpaces(n: number) {
    var spaces = '';
    for (var i = 0; i < n; i++) {
        spaces += '  ';
    }
    return spaces
} 
 
/**
 * Loads a page from cache if it exists
 */
async function loadPage(cachedArea: mp, depth: number) {
    let name: string, areas: mp[], coordinates: [number, number]

    if (cachedArea.loaded) {
        name = cachedArea.name
        // console.log(printSpaces(depth), "From cache", name)

        areas = cachedArea.routeType === "area" ? cachedArea.areas : []
        coordinates = cachedArea.routeType === "area" ? cachedArea.coordinates : [0, 0]
        return { name, areas, coordinates }
    }

    sessionRequestsMade++;

    // const page = await getPage(cachedArea.url)
    const page = await scraperBatcher.enqueue(getPage, cachedArea.url)
    areas = getAreas(page).map(url => ({url, loaded: false}))
    name = getName(page)
    coordinates = getCoordinates(page);

    console.log(printSpaces(depth), "Requested", name)
    return { areas, name, coordinates }
}

async function sleep(time: number) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve(time) 
        }, time)
    })
}

async function scrape(cachedArea: mp, depth: number): Promise<mp> {

    const { name, areas, coordinates } = await loadPage(cachedArea, depth);

    const isRouteParent = areas.length === 0
    if (isRouteParent) {
        if (cachedArea.loaded) {
            return cachedArea
        }
        const routes = getRoutes(await getPage(cachedArea.url))

        const routeObjects: mp[] = await Promise.all(routes.map(async route => {
            const routeId = route.url.split("/").at(-2)
            const url = `https://www.mountainproject.com/api/v2/routes/${routeId}/ticks?per_page=250&page=1`
            const ticks = await getTicks(url)

            return {
                routeType: "climb",
                ticks,
                loaded: true,
                url: route.url,
                name: route.name
            }
        }))

        return {
            loaded: true,
            routeType: "area",
            areas: routeObjects,
            coordinates,
            name,
            url: cachedArea.url
        }
    }
  
    let loadedAreas: mp[] = []

    // Request limit hit, stop recursing
    if (sessionRequestsMade > maxSessionRequests) {
 
        return {
            routeType: "area",
            name,
            url: cachedArea.url,
            coordinates,
            loaded: true,
            areas
        }
    }
    /*
    for (const [i, area] of areas.entries()) {
        loadedAreas.push(await scrape(area, depth + 1, i * 50))
    }
    */
    
    await Promise.all(areas.map(async (area, i) => {
        loadedAreas.push(await scrape(area, depth + 1))
    }))
    

    return {
        routeType: "area",
        name,
        url: cachedArea.url,
        coordinates,
        loaded: true,
        areas: loadedAreas
    }

}


export async function loadJsonFromFile(filePath: string): Promise<mp> {
    try {
        const data = await readFile(filePath, 'utf8');
        console.log("loading", filePath)
        return JSON.parse(data);
    } catch (error) {
        throw error;  // Re-throw the error if it's not the 'file not found' error
    }
}

export async function writeJsonToFile(filePath: string, jsonData: object, spaces=false) {
    try {
        const stringifiedData = JSON.stringify(jsonData, null, spaces ? 4 : undefined);  // 4 spaces indentation
        await writeFile(filePath, stringifiedData, 'utf8');
    } catch (error) {
        throw error;
    }
}

export async function batch(fn: string, root: string) {
    let rootObj;
    try {
        rootObj = await loadJsonFromFile(fn)
    } catch {
        rootObj = { url: root, loaded: false } as const
    }
    const allData = await scrape(rootObj, 0);
    
    await writeJsonToFile(fn, allData);

    if (sessionRequestsMade === 0) {
        return
    }

    sessionRequestsMade = 0;
    console.log("Saving progress...")
    await batch(fn, root);

}
 