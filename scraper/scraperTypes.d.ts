export type MPNotLoaded = {
    loaded: false
    url: string
}

export type MPClimb = {
    loaded: true
    routeType: "climb"
    name: string
    url: string
    ticks: string[]
}

export type MPArea = {
    loaded: true
    routeType: "area"
    name: string
    url: string
    coordinates: [number, number]
    areas: mp[]
}

export type mp = MPNotLoaded | MPClimb | MPArea