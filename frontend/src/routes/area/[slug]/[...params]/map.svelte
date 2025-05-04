<script lang="ts">
    import { onMount } from "svelte";
    import mapboxgl from "mapbox-gl";
    import { addMonthlyCounts } from "$lib/aggregateTicks";
    import type { MonthlyCounts } from "$lib/aggregateTicks";
    import type { AreaPayload } from "$lib/kvTypes";

    export let areaData: AreaPayload;

    let idx = 0; // index of the current month
    const max = 12; // number of months in the slider

    // ① enrich with monthly counts
    addMonthlyCounts(areaData);

    // ② state
    let months: string[]; // e.g. ["2024‑10", "2024‑11", …]
    let current = ""; // currently selected yyyy‑mm
    let map: mapboxgl.Map;

    // ③ compute month options just once
    onMount(() => {
        const set = new Set<string>();
        areaData.areas.forEach((a) => {
            Object.keys((a as any).monthly as MonthlyCounts).forEach((m) =>
                set.add(m),
            );
        });
        months = [...set].sort(); // chronological
        current = months.at(-1); // default = most recent

        initMap();
    });

    /** Build / refresh the geojson for the chosen month */
    function geojson(month: string) {
        return {
            type: "FeatureCollection",
            features: areaData.areas.map((a) => ({
                type: "Feature",
                geometry: {
                    type: "Point",
                    coordinates: [a.coordinates[1], a.coordinates[0]],
                },
                properties: {
                    name: a.name,
                    count: ((a as any).monthly as MonthlyCounts)[month] ?? 0,
                },
            })),
        };
    }

    /** Initialise map and the two layers (circle + number) */
    function initMap() {
        mapboxgl.accessToken =
            "pk.eyJ1IjoibmF0aGFubGxlZTEiLCJhIjoiY2xreG53ZnhvMDJ0ODNkcXU4bDMza2dzcCJ9.gyKD3qBrU0Uh-DztRsrVgg";
        map = new mapboxgl.Map({
            container: "historicalMap",
            style: "mapbox://styles/nathanllee1/clkxnzl9o003201pu43ho3cxu",
            center: [areaData.coordinates[1], areaData.coordinates[0]],
            zoom: 9,
        });

        map.on("load", () => {
            map.addSource("crags", {
                type: "geojson",
                data: geojson(current),
                cluster: true,
                clusterMaxZoom: 15,
                clusterRadius: 50,
                clusterProperties: {
                    count: ["+", ["get", "point_count"], 0],
                },
            });

            map.addLayer({
                id: "crag-circles",
                type: "circle",
                source: "crags",
                paint: {
                    "circle-color": "#FF6B00",
                    "circle-radius": [
                        "interpolate",
                        ["linear"],
                        ["get", "count"],
                        0,
                        10,
                        30,
                        14,
                        100,
                        20,
                    ],
                    "circle-opacity": 0.6,
                },
            });

            map.addLayer({
                id: "crag-labels",
                type: "symbol",
                source: "crags",
                layout: {
                    "text-field": ["to-string", ["get", "count"]],
                    "text-size": 14,
                    "text-font": ["Open Sans Bold"],
                    "text-allow-overlap": true,
                },
                paint: { "text-color": "#ffffff" },
            });

            map.addLayer({
                id: "clusters",
                type: "circle",
                source: "crags",
                filter: ["has", "point_count"],
                paint: {
                    "circle-color": "#FF6B00",
                    "circle-radius": [
                        "step",
                        ["get", "point_count"],
                        20,
                        2,
                        20,
                        10,
                        30,
                        20,
                        40,
                    ],
                    "circle-opacity": 0.6,
                },
            });
        });
    }

    /** Call whenever the month slider changes */
    function updateMonth(m: string) {
        current = m;
        (map.getSource("crags") as mapboxgl.GeoJSONSource)?.setData(geojson(m));
    }
</script>

<!-- UI -->
<div class="mb-2 flex items-center gap-4">
    <input
        type="range"
        min="0"
        {max}
        bind:value={idx}
        on:input={() => updateMonth(months[idx])}
    />
    <span class="tabular-nums text-lg">{current}</span>
</div>

<!-- Map -->
<div id="historicalMap" class="h-96 w-full rounded-lg shadow-sm" />
