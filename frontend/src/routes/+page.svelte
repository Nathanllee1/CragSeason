<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { browser } from "$app/environment";
    import type { PageData } from "./$types";

    import { currentPoint } from "$lib";
    import Info from "./info.svelte";
    import { fetchPoints, insertRelativeSizes, mapStore } from "$lib/map";
    import mapboxgl from "mapbox-gl";
    import Legend from "./legend.svelte";
    import Help from "./help.svelte";

    export let data;

    onMount(async () => {
        if (!browser) {
            return;
        }
        mapboxgl.accessToken =
            "pk.eyJ1IjoibmF0aGFubGxlZTEiLCJhIjoiY2xreG53ZnhvMDJ0ODNkcXU4bDMza2dzcCJ9.gyKD3qBrU0Uh-DztRsrVgg";

        const map = new mapboxgl.Map({
            container: "mapboxMap",
            style: "mapbox://styles/nathanllee1/clkxnzl9o003201pu43ho3cxu",
            center: [-122.09653, 37.22977],
            zoom: 3,
        });

        const pointsWithSeasonScaling = insertRelativeSizes(data.props.points);

        console.log(pointsWithSeasonScaling);

        await mapStore.createMap(map, pointsWithSeasonScaling);
    });
</script>

<Legend />

{#if $currentPoint && $currentPoint.properties}
    <Info />
{/if}
<div id="mapboxMap" class="h-[100dvh] w-screen" />

<style>
</style>
