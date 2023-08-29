export type mp = {
    url: string
} & ({
    loaded: false
} | ({
    loaded: true,
    name: string
} & (area | climb)))

type area = {
    routeType: "area",
    areas: mp[]
    coordinates: [number, number],
}

type climb = {
    routeType: "climb",
    ticks: string[] // A list of dates
}