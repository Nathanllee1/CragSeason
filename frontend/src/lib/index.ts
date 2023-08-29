import { writable } from "svelte/store";


export const currentPoint = writable<mapboxgl.MapboxGeoJSONFeature>(undefined)
