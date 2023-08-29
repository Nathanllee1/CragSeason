import * as cheerio from 'cheerio';
import { TickResponse } from './mpAPI';
import { Batcher } from './batcher';

const apiBatcher = new Batcher(250)


export async function getPage(areaURL: string) {


    const res = await fetch(areaURL);

    return cheerio.load(await res.text());
}
export const getAreas = (areaPage: cheerio.Root) => {

    const hrefs: string[] = [];

    areaPage('.lef-nav-row a').each(function () {
        // @ts-ignore
        const href = areaPage(this).attr('href');
        if (!href) {
            return;
        }
        hrefs.push(href);
    });

    return hrefs;
};
export const getName = (areaPage: cheerio.Root) => {
    return areaPage('h1').text().trim().split("\n")[0];
};


export const getCoordinates = (areaPage: cheerio.Root): [number, number] => {
    const coords = areaPage('.description-details tbody tr td')
        .text()
        .split("\n")[1]

    if (!coords) {
        return [0, 0]
    }

    return coords.trim()
        .split(", ")
        .map(coordinate => parseFloat(coordinate)) as [number, number]
}

export const getRoutes = (areaPage: cheerio.Root) => {
    const routes: { name: string, url: string }[] = []
    areaPage('#left-nav-route-table a').each(function () {
        // @ts-ignore
        const url = areaPage(this).attr('href')
        // @ts-ignore
        const name = areaPage(this).text()

        if (!url || !name) {
            return
        }

        routes.push({ url, name })
    })

    return routes
}

export const getTicks = async (url: string) => {
    //const res = await fetch(url);

    const res = await apiBatcher.enqueue(fetch, url)

    if (!res.ok) {
        throw(await res.text())
    }

    const data: TickResponse = await res.json()

    const nextPage = data.next_page_url;

    if (!data.data) {
        return []
    }

    const ticks: string[] = data.data.map(tick => {
        return tick.createdAt
    })

    if (nextPage) {
        ticks.push(... await getTicks(nextPage))
    }

    return ticks
}
