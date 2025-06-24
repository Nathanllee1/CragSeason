<script lang="ts">
    import { tweened } from "svelte/motion";
    import { liveStore, type LiveData } from "./liveData";
    import { cubicOut } from "svelte/easing";
    import { fade } from "svelte/transition";
    import { lastUpdatedString } from "./lastUpdated";
    import type { rootAreaInfo } from "$lib/kvTypes";

    export let data: rootAreaInfo[];
    export let id: string;

    const tweenedProgress = tweened(0, {
        duration: 1000,
        easing: cubicOut,
    });

    liveStore.subscribe(({ progress }) => {
        tweenedProgress.set(progress);
    });
</script>

<div class="h-16 grid mb-4">
    {#if $liveStore.fetchingData}
        <div out:fade class="col-start-1 col-end-2 row-start-1 row-end-2">
            <br />

            <div>{$liveStore.status}</div>

            <progress
                class="w-full progress progress-primary"
                value={$tweenedProgress}
                max="100"
            />
        </div>
    {:else}
        <div
            in:fade
            class="col-start-1 col-end-2 row-start-1 row-end-2 mt-4 mb-4 flex gap-2"
        >
            <div>Last updated {lastUpdatedString($liveStore.lastUpdated)}</div>
            <button
                class="btn btn-xs btn-primary btn-outline"
                on:click={() => liveStore.getLiveData(id, data, true)}
                >Refresh Data</button
            >
        </div>
    {/if}
</div>
