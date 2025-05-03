import { writable } from "svelte/store";


export const currentPoint = writable<mapboxgl.MapboxGeoJSONFeature>(undefined)


export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))