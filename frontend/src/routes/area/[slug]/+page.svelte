<script lang="ts">
    import { onMount } from "svelte";
    import OverallChart from "./overallChart.svelte";
    import type { FeatureProperties } from "$lib/cragseason";
    import { KV } from "$lib/kv";
    import LiveData from "./live/liveData.svelte";
    import type { rootAreaInfo } from "$lib/kvTypes";
    import Map from "./map.svelte";

    export let data;
    let currentArea: FeatureProperties;

    let kvData: rootAreaInfo[] = [];

</script>

{#if data.areaInfo}
    <Map areaData={data.areaInfo} />
{/if}
