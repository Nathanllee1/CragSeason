import { batch } from "./scraper"

const areas: Record<string, string> = {
    'alabama': 'https://www.mountainproject.com/area/105905173/alabama',
    'alaska': 'https://www.mountainproject.com/area/105909311/alaska',
    'arizona': 'https://www.mountainproject.com/area/105708962/arizona',
    'arkansas': 'https://www.mountainproject.com/area/105901027/arkansas',
    'california': 'https://www.mountainproject.com/area/105708959/california',
    'colorado': 'https://www.mountainproject.com/area/105708956/colorado',
    'connecticut': 'https://www.mountainproject.com/area/105806977/connecticut',
    'delaware': 'https://www.mountainproject.com/area/106861605/delaware',
    'florida': 'https://www.mountainproject.com/area/111721391/florida',
    'georgia': 'https://www.mountainproject.com/area/105897947/georgia',
    'hawaii': 'https://www.mountainproject.com/area/106316122/hawaii',
    'idaho': 'https://www.mountainproject.com/area/105708958/idaho',
    'illinois': 'https://www.mountainproject.com/area/105911816/illinois',
    'indiana': 'https://www.mountainproject.com/area/112389571/indiana',
    'iowa': 'https://www.mountainproject.com/area/106092653/iowa',
    'kansas': 'https://www.mountainproject.com/area/107235316/kansas',
    'kentucky': 'https://www.mountainproject.com/area/105868674/kentucky',
    'louisiana': 'https://www.mountainproject.com/area/116720343/louisiana',
    'maine': 'https://www.mountainproject.com/area/105948977/maine',
    'maryland': 'https://www.mountainproject.com/area/106029417/maryland',
    'massachusetts': 'https://www.mountainproject.com/area/105908062/massachusetts',
    'michigan': 'https://www.mountainproject.com/area/106113246/michigan',
    'minnesota': 'https://www.mountainproject.com/area/105812481/minnesota',
    'mississippi': 'https://www.mountainproject.com/area/108307056/mississippi',
    'missouri': 'https://www.mountainproject.com/area/105899020/missouri',
    'montana': 'https://www.mountainproject.com/area/105907492/montana',
    'nebraska': 'https://www.mountainproject.com/area/116096758/nebraska',
    'nevada': 'https://www.mountainproject.com/area/105708961/nevada',
    'ohio': 'https://www.mountainproject.com/area/105994953/ohio',
    'oklahoma': 'https://www.mountainproject.com/area/105854466/oklahoma',
    'oregon': 'https://www.mountainproject.com/area/105708965/oregon',
    'pennsylvania': 'https://www.mountainproject.com/area/105913279/pennsylvania',
    'tennessee': 'https://www.mountainproject.com/area/105887760/tennessee',
    'texas': 'https://www.mountainproject.com/area/105835804/texas',
    'utah': 'https://www.mountainproject.com/area/105708957/utah',
    'vermont': 'https://www.mountainproject.com/area/105891603/vermont',
    'virginia': 'https://www.mountainproject.com/area/105852400/virginia',
    'washington': 'https://www.mountainproject.com/area/105708966/washington',
    'wisconsin': 'https://www.mountainproject.com/area/105708968/wisconsin',
    'wyoming': 'https://www.mountainproject.com/area/105708960/wyoming',
    'new_hampshire': 'https://www.mountainproject.com/area/105872225/new-hampshire',
    'new_jersey': 'https://www.mountainproject.com/area/106374428/new-jersey',
    'new_mexico': 'https://www.mountainproject.com/area/105708964/new-mexico',
    'new_york': 'https://www.mountainproject.com/area/105800424/new-york',
    'north_carolina': 'https://www.mountainproject.com/area/105873282/north-carolina',
    'north_dakota': 'https://www.mountainproject.com/area/106598130/north-dakota',
    'rhode_island': 'https://www.mountainproject.com/area/106842810/rhode-island',
    'south_carolina': 'https://www.mountainproject.com/area/107638915/south-carolina',
    'south_dakota': 'https://www.mountainproject.com/area/105708963/south-dakota',
    'west_virginia': 'https://www.mountainproject.com/area/105855459/west-virginia',
    'north_america': 'https://www.mountainproject.com/area/106661469/north-america',
    'europe': 'https://www.mountainproject.com/area/106660030/europe',
    'asia': 'https://www.mountainproject.com/area/106661515/asia',
    'south_america': 'https://www.mountainproject.com/area/106661603/south-america',
    'africa': 'https://www.mountainproject.com/area/106135596/africa',
    'oceania': 'https://www.mountainproject.com/area/107833406/oceania',
    'australia': 'https://www.mountainproject.com/area/105907756/australia',
    'antarctica': 'https://www.mountainproject.com/area/113864722/antarctica'
}


async function main() {
    for (const area of Object.keys(areas)) {
        await batch(`data/${area}.json`, areas[area])
    }
}

main()