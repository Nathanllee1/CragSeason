<script lang="ts">
    import type { rootAreaInfo } from "$lib/kvTypes";
    import { onMount } from "svelte";

    export let historicalData: rootAreaInfo[];

    let totalTicks = 0;
    let totalClimbs = 0;

    $: {
        totalTicks = historicalData.reduce((prev, curr) => {
            prev += curr.ticks.length;
            totalClimbs += 1;

            return prev;
        }, 0);
    }
</script>

<div class="stats shadow bg-base-200">
    <div class="stat">
        <div class="stat-title">Total Ticks</div>
        <div class="stat-value text-primary">{totalTicks}</div>
        <div class="stat-desc">Total number of <br /> ticks in the area</div>
    </div>

    <div class="stat">
        <div class="stat-title">Total Climbs</div>
        <div class="stat-value text-secondary">{totalClimbs}</div>
        <div class="stat-desc">
            Total number of climbs <br /> in the area with > 20 ticks
        </div>
    </div>
</div>
