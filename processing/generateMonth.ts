import { readFile } from "fs/promises";
import { loadJsonFromFile } from "../scraper/scraper"

interface Feature {
    type: string;
    geometry: {
        type: string;
        coordinates: [number, number];
    };
    properties: {
        monthTicks: number[];
        totalTicks: number;
        url: string;
        seasonMetric: number;
        coordinates: [number, number];
        name: string;
    };
}

async function main() {

    const data = JSON.parse(await readFile("static/all.geojson", "utf-8"))

    const features = data.features as Feature[]

    

}


main()