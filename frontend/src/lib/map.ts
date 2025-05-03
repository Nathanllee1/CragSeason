import { browser } from "$app/environment";
import { get, writable } from "svelte/store"
import "mapbox-gl/dist/mapbox-gl.css";
import { currentPoint } from "$lib";
import { cardOpen } from "./cardOpen";

let hasLookedAtDetails = false;

export function insertRelativeSizes(geojson: object, scalar = 1) {
    // If no features, just return
    if (!geojson.features) {
        return geojson;
    }

    // Loop through each feature
    for (const feature of geojson.features) {
        const { monthTicks, totalTicks } = feature.properties;
        if (!Array.isArray(monthTicks) || monthTicks.length !== 12 || !totalTicks) {
            // If data is missing or invalid, just store an array of zeros
            feature.properties.relativeSizes = new Array(12).fill(0);
            continue;
        }

        // Build a new array of relative sizes
        const relativeSizes = [];
        for (let i = 0; i < 12; i++) {
            // Example approach: ratio * scalar
            const ratio = monthTicks[i] / totalTicks;
            const scaled = ratio * scalar;
            relativeSizes.push(scaled);
        }

        // Insert the array
        feature.properties.relativeSizes = relativeSizes;
    }

    // Return the updated GeoJSON
    return geojson;
}

export const fetchPoints = async () => {

    const response = await fetch("/all2.geojson");

    const contentLength = response.headers.get("content-length");
    console.log(contentLength)

    const data = await response.json();

    return data;

}

export const mapStore = (() => {
    const { set, update, subscribe } = writable<mapboxgl.Map>();

    return {
        subscribe,
        update,
        set,
        createMap: async (map: mapboxgl.Map, data: object) => {
            set(map)
            map.on("load", async function () {

                const currentMonth = new Date().getMonth();

                map.flyTo({
                    center: [11.8213, 46.5187],
                    speed: 0.008
                })

                map.addSource("world-data", {
                    type: "geojson",
                    data
                });

                // Code for adding the layers will go here
                // Point layer with color based on season metric
                map.addLayer({
                    id: "world-points",
                    type: "circle",
                    source: "world-data",
                    paint: {
                        "circle-color": [
                            "interpolate",
                            ["linear"],
                            ["get", "seasonMetric"],
                            0,
                            "#00d5ff", // Light Blue for winter
                            1,
                            "#eb4034", // Yellow for summer
                        ],
                        'circle-radius': [
                            'interpolate',
                            ['linear'],
                            ['zoom'],
                            3, ['interpolate', ['linear'], ['get', 'totalTicks'], 10, 4, 30000, 9],  // Zoom level 3

                            18, ['interpolate', ['linear'], ['get', 'totalTicks'], 10, 8, 500, 16, 5000, 18, 30000, 30]   // Zoom level 18
                        ],
                    },
                });

                map.addLayer({
                    id: "highlight-layer",
                    type: "circle",
                    source: {
                        type: 'geojson',
                        data: {
                            type: 'FeatureCollection',
                            features: []
                        }
                    },
                    paint: {
                        "circle-stroke-color": '#fffdf7',  // Highlight color for the ring
                        "circle-stroke-width": 3,
                        "circle-opacity": 0,  // Make the fill transparent
                        "circle-radius": [
                            'interpolate',
                            ['linear'],
                            ['zoom'],
                            3, ['interpolate', ['linear'], ['get', 'totalTicks'], 10, 5, 30000, 10],  // Zoom level 3
                            18, ['interpolate', ['linear'], ['get', 'totalTicks'], 10, 9, 500, 20, 5000, 22, 30000, 35]   // Zoom level 18
                        ],
                    }
                });  // The 'before' parameter ensures the highlight layer is below the 'world-points' layer


                map.addLayer({
                    id: "text-layer",
                    type: "symbol",
                    minzoom: 6,
                    source: "world-data",
                    layout: {
                        "text-field": ["to-string", ["get", "name"]],
                        "text-offset": [4, 0], // Offset to position label to the right of the circle
                        "text-size": [
                            "interpolate",
                            ["linear"],
                            ["zoom"],
                            10,
                            10, // At zoom level 10, text size is 10
                            18,
                            16, // At zoom level 18, text size is 16
                        ],
                    },
                    paint: {
                        "text-color": "#000",
                    },
                });
                map.addLayer({
                    id: "highlight-text-layer",
                    type: "symbol",
                    source: {
                        type: 'geojson',
                        data: {
                            type: 'FeatureCollection',
                            features: []
                        }
                    },
                    layout: {
                        "text-field": ["to-string", ["get", "name"]],
                        "text-offset": [4, 0], // Offset to position label to the right of the circle
                        "text-size": [
                            "interpolate",
                            ["linear"],
                            ["zoom"],
                            10,
                            12, // At zoom level 10, text size is 10
                            18,
                            20, // At zoom level 18, text size is 16
                        ],
                        'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold']
                    },
                    paint: {
                        "text-color": "#000",
                    },
                });

                map.on("click", () => {
                    cardOpen.set(false)
                })

                map.on("click", "world-points", function (e) {
                    // This function will be triggered when a point in the 'world-points' layer is clicked
                    // currentPoint = map.queryRenderedFeatures(e.point)[0];

                    if (!hasLookedAtDetails) {

                        hasLookedAtDetails = true;

                        umami.track("hasLookedAtDetails")

                    }

                    map.flyTo({
                        // @ts-ignore
                        center: e.features?.[0].geometry.coordinates,
                        offset: [0, -150],
                        animate: true,
                        speed: 0.1,
                        screenSpeed: 0.5,
                    })

                    cardOpen.set(true)
                    currentPoint.set(map.queryRenderedFeatures(e.point)[0]);

                    map.getSource('highlight-layer').setData({
                        type: 'FeatureCollection',
                        features: [e.features[0]]
                    });

                    map.getSource('highlight-text-layer').setData({
                        type: 'FeatureCollection',
                        features: [e.features[0]]
                    });

                    // console.log(currentPoint);
                });

                map.on("mouseenter", "world-points", function () {
                    map.getCanvas().style.cursor = "pointer"; // Change the cursor to a pointer when hovering over a point
                });

                map.on("mouseleave", "world-points", function () {
                    map.getCanvas().style.cursor = ""; // Reset the cursor when no longer hovering over a point
                });

                createCurrentSeasonLayer(map, currentMonth - 1);


                mode.subscribe(value => {
                    if (value === "currentSeasons") {
                        map.setLayoutProperty("current-month-points", "visibility", "visible");
                        map.setLayoutProperty("world-points", "visibility", "none");
                    } else {
                        map.setLayoutProperty("current-month-points", "visibility", "none");
                        map.setLayoutProperty("world-points", "visibility", "visible");
                    }   
                });


                set(map);
            });
        }
    }
})()

async function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to create a dynamic circle size based on the current month's scaling property
export function createCurrentSeasonLayer(map: mapboxgl.Map, currentMonth: number) {
    console.log(currentMonth)
    map.addLayer({
        id: 'current-month-points',
        type: 'circle',
        source: {
            type: 'geojson',
            data: {
                type: 'FeatureCollection',
                features: []
            }
        },
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            // We'll default to the currentMonth
            ['at', 11, ['get', 'scaling']],
            0, 2,
            1, 20
          ],
          'circle-color': '#FF5C5C',
          'circle-opacity': 0.8
        }
      });
}

export const mode = writable<"allSeasons" | "currentSeasons">("allSeasons");

