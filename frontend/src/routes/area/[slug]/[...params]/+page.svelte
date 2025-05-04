<script lang="ts">
    import { onMount } from "svelte";
    import OverallChart from "./overallChart.svelte";
    import type { FeatureProperties } from "$lib/cragseason";
    import { KV } from "$lib/kv";
    import LiveData from "./live/liveData.svelte";
    import type { rootAreaInfo } from "$lib/kvTypes";
    import Map from "./map.svelte";
    import Stats from "./historical/stats.svelte";

    export let data;
    let currentArea: FeatureProperties;

    let kvData: rootAreaInfo[] = [];
</script>

{#if data.areaInfo}

    <div class="tabs tabs-border tabs-xl">
        <input
            type="radio"
            name="tabs"
            class="tab"
            aria-label="Historical Data"
            checked={true}
        />
        <div class="tab-content mt-4">
            <Stats historicalData={data.areaInfo.areas} />
            <br />
            <!--<Map areaData={data.areaInfo} /> -->
        </div>

        <input type="radio" name="tabs" class="tab" aria-label="Live Data" />
        <div class="tab-content mt04">
            <LiveData data={data.areaInfo.areas} id={data.id} />
        </div>
    </div>
{/if}
