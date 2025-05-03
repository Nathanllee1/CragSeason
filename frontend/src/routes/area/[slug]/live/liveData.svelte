<script lang="ts">
    import { sleep } from "$lib";
    import type { rootAreaInfo } from "$lib/kvTypes";
    import type { Tick, TickResponse } from "$lib/mptypes";
    import { onDestroy, tick } from "svelte";
    import { crossfade, fade } from "svelte/transition";
    import { tweened } from "svelte/motion";
    import { cubicOut, quintOut } from "svelte/easing";
    import { liveStore } from "./liveData";
    import { lastUpdatedString } from "./lastUpdated";

    export let data: rootAreaInfo[];
    export let id: string;

    const [send, receive] = crossfade({
        fallback(node) {
            const { height } = node.getBoundingClientRect();
            return {
                duration: 600,
                easing: quintOut,
                css: (t) => `
            transform: translateY(${(1 - t) * height}px);
            opacity: ${t}
          `,
            };
        },
    });

    const tweenedProgress = tweened(0, {
        duration: 1000,
        easing: cubicOut,
    });

    liveStore.subscribe(({ progress }) => {
        tweenedProgress.set(progress);
    });
</script>

<div class="h-16 grid">
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
        <div in:fade class="col-start-1 col-end-2 row-start-1 row-end-2 mt-4 mb-4 flex gap-2">
            <div>Last updated {lastUpdatedString($liveStore.lastUpdated)}</div>
            <button
                class="btn btn-xs btn-primary btn-outline"
                on:click={() => liveStore.initialize(id, data, true)}
                >Refresh Data</button
            >
        </div>
    {/if}
</div>

{#if $liveStore.fetchingData || $liveStore.isLoaded}
    <div class="overflow-x-auto rounded-box bg-base-100">
        <div class="max-h-96 overflow-y-auto">
            <table class="table w-full table-pin-rows">
                <thead>
                    <tr>
                        <th>Area</th>
                        <th>Number of Recent Ascents</th>
                        <th>Last Climbed</th>
                    </tr>
                </thead>
                <tbody>
                    {#each $liveStore.ticks as tick}
                        <tr class="hover:bg-base-200">
                            <td>{tick.climbData.name}</td>
                            <td>{tick.tickData.length}</td>
                            <td>{tick.tickData.at(-1)?.createdAt}</td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    </div>
{/if}
