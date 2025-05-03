import { GeolibInputCoordinates } from "geolib/es/types";
import { Batcher } from "../scraper/batcher";
import { loadJsonFromFile, writeJsonToFile } from "../scraper/scraper";
import { mp } from "../scraper/scraperTypes";
import * as cheerio from 'cheerio';
import { childrenCloseBy } from "../processing/process";
import { join } from "path";

const batcher = new Batcher(300)

async function getPage(pageUrl: string) {
    const res = await fetch(pageUrl)

    const pageContent = cheerio.load(await res.text())

    return pageContent
}

function getTopImages(page: cheerio.Root) {

    let images: string[] = []

    page('.photo-link').each(function () {
        // @ts-ignore
        images.push(page(this).attr("href"))

    })

    return images
}


function getPageViews(page: cheerio.Root) {

    const views = page('.description-details tbody tr td')
        .text()
        .split("\n")[5]

    return Number((views.trim().split(" ")[0]).replace(",", ""))

}

type picture = {
    id: string,
    description: string,
    date: string,
    user: {
        username: string,
        profile_url: string
    }
}


type cragguessrFormat = {
    coordinates: number[]
    pictures: picture[],
    url: string
    name: string
    pageViews: number
}


async function getPicturesInArea(area: mp) {

    if (!area.loaded) {
        throw Error("Area not laoded")
    }

    const pageData = await batcher.enqueue(getPage, area.url)
    const images = getTopImages(pageData).slice(undefined, 1)

    const imagesWithRating:picture[] = []

    await Promise.all(images.map(async (image) => {
        const imagePage = await batcher.enqueue(getPage, image)

        const averageRating = Number(imagePage('.title  span').eq(1).text().trim());

        // Find and extract the number of votes
        const numberOfVotes = Number( imagePage('.title  span').eq(2).text().trim());

        if (numberOfVotes === 0) {
          return  
        }

        if (averageRating <= 4) {
            return
        }

        console.log(image, averageRating, numberOfVotes)

        const profileUrl = imagePage('.mt-1 .float-xs-left a').attr('href')!.trim();
        const username = imagePage('.mt-1 .float-xs-left a').text().trim();

        const date = imagePage('.mt-1 .text-muted.small').text().trim();
        const description = imagePage('.photo-title').contents().not('.huge-quotation-mark').text().trim();


        const imageMeta = ({
            id: (image),
            description,
            date,
            user: {
                profile_url: profileUrl,
                username
            }
        })

        imagesWithRating.push(imageMeta)

    }))

    if (area.routeType === "area") {

        await Promise.all(area.areas.map(async area => {
            imagesWithRating.push(...await getPicturesInArea(area))
        }))

    }

    return imagesWithRating


}

async function parseTree(data: mp): Promise<cragguessrFormat[]> {

    let areas: cragguessrFormat[] = []

    if (!data.loaded) {
        return []
    }

    if (!data.loaded || data.routeType === "climb") {
        throw Error(`Can't process climbs: ${JSON.stringify(data)}`)
    }

    const childcoordinates = data.areas.map(area => {
        if (!area.loaded || area.routeType === "climb") {
            return undefined
        }

        return area.coordinates
    }).filter(area => area) as GeolibInputCoordinates[]

    if (!childrenCloseBy(data.coordinates as GeolibInputCoordinates, childcoordinates, 600)) {

        await Promise.all(data.areas.map(async (area) => {
            areas.push(...await parseTree(area))
        }))
    }


    const pageData = await batcher.enqueue(getPage, data.url)
    const pageViews = getPageViews(pageData)

    if (pageViews < 3000000) {
        return []
    }

    console.log(data.name)

    const areaImages = await getPicturesInArea(data)

    return [{
        coordinates: data.coordinates,
        name: data.name,
        pageViews: 0,
        pictures: areaImages,
        url: data.url
    }]

}

async function getPictures(dataFilePath: string) {
    
    const data = await loadJsonFromFile(dataFilePath)

    const pictureData = await parseTree(data)

    writeJsonToFile("./cragguessr/data/california", pictureData)

}

getPictures("data/california.json")