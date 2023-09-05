<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { browser } from "$app/environment";
    import type { PageData } from "./$types";

    import { currentPoint } from "$lib";
    import Info from "./info.svelte";
    import { mapStore } from "$lib/map";
    import mapboxgl from "mapbox-gl";
    import Legend from "./legend.svelte";

    onMount(async () => {
        if (!browser) {
            return;
        }
        mapboxgl.accessToken =
            "pk.eyJ1IjoibmF0aGFubGxlZTEiLCJhIjoiY2xreG53ZnhvMDJ0ODNkcXU4bDMza2dzcCJ9.gyKD3qBrU0Uh-DztRsrVgg";

        const map = new mapboxgl.Map({
            container: "mapboxMap",
            style: "mapbox://styles/nathanllee1/clkxnzl9o003201pu43ho3cxu",
        });

        mapStore.createMap(map);
    });
</script>

<div class="absolute z-10 w-screen bg-base-100 navbar">
    <div class="flex-1 gap-2 align-baseline">
        <h1 class="text-2xl font-extrabold text-primary">Crag Season</h1>
        <div class="self-auto mt-1 hidden lg:block">
            View what season people climb
        </div>
    </div>

    <div class="font-light text-sm flex-none block">
        Data sourced from <a
            class="link"
            href="https://www.mountainproject.com/">Mountain Project</a
        > ticks
    </div>
</div>

<Legend />

{#if $currentPoint && $currentPoint.properties}
    <Info />
{/if}
<div id="mapboxMap" class="h-screen w-screen" />

<style>
</style>
