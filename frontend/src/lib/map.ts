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
                map.addSource("california-data", {
                    type: "geojson",
                    data: "/all4.geojson", // Replace with the path to your GeoJSON file
                });
        
                // Code for adding the layers will go here
                // Point layer with color based on season metric
                map.addLayer({
                    id: "california-points",
                    type: "circle",
                    source: "california-data",
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
                    id: "text-layer",
                    type: "symbol",
                    minzoom: 7,
                    source: "california-data",
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
        
                map.on("click", "california-points", function (e) {
                    // This function will be triggered when a point in the 'california-points' layer is clicked
                    // currentPoint = map.queryRenderedFeatures(e.point)[0];
                    currentPoint.set(map.queryRenderedFeatures(e.point)[0]);
                    map.flyTo({
                        // @ts-ignore
                        center: e.features?.[0].geometry.coordinates,
                        zoom: 12,
                        animate: true,
                        speed: 0.5,
                        screenSpeed: 0.5,
                    });
                    // console.log(currentPoint);
                });
        
                map.on("mouseenter", "california-points", function () {
                    map.getCanvas().style.cursor = "pointer"; // Change the cursor to a pointer when hovering over a point
                });
        
                map.on("mouseleave", "california-points", function () {
                    map.getCanvas().style.cursor = ""; // Reset the cursor when no longer hovering over a point
                });
        
                set(map);
            });
        }
    }
})()