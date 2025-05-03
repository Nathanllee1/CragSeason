export interface IndexEntry {
    o: number;
    l: number;
}

export type rootAreaInfo = {
    id: string,
    ticks: string[],
    name: string,
    coordinates: [number, number]
}

export type AreaPayload = {
    name: string;          // human‑readable area name (e.g. “School Rock”)
    areas: rootAreaInfo[]; // the list you already build in makeAreaInfo
    coordinates: [number, number] // the coordinates of the area
};

type areaInfo = Record<string, AreaPayload>;
