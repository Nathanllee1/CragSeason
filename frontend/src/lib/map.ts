import { browser } from "$app/environment";
import { writable } from "svelte/store"
import "mapbox-gl/dist/mapbox-gl.css";
import { currentPoint } from "$lib";


export const mapStore = (() => {
    const { set, update, subscribe } = writable<mapboxgl.Map>();

    return {
        subscribe,
        update,
        set,
        createMap: (map: mapboxgl.Map) => {
            set(map)
            map.on("load", function () {
                map.addSource("world-data", {
                    type: "geojson",
                    data: "/all.geojson", // Replace with the path to your GeoJSON file
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
                        "text-allow-overlap": false,
                    },
                    paint: {
                        "text-color": "#000",
                    },
                });

                map.on("click", "world-points", function (e) {
                    // This function will be triggered when a point in the 'world-points' layer is clicked
                    // currentPoint = map.queryRenderedFeatures(e.point)[0];
                    currentPoint.set(map.queryRenderedFeatures(e.point)[0]);
                    map.flyTo({
                        // @ts-ignore
                        center: e.features?.[0].geometry.coordinates,
                        offset: [0, -150],
                        animate: true,
                        speed: 0.5,
                        screenSpeed: 0.5,

                    });

                    map.getSource('highlight-layer').setData({
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

                set(map);
            });
        }
    }
})()