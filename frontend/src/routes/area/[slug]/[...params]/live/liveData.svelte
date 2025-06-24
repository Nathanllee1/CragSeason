<script lang="ts">
    import { sleep } from "$lib";
    import type { rootAreaInfo } from "$lib/kvTypes";
    import type { Tick, TickResponse } from "$lib/mptypes";
    import { onDestroy, tick } from "svelte";
    import { crossfade, fade } from "svelte/transition";
    import { tweened } from "svelte/motion";
    import { cubicOut, quintOut } from "svelte/easing";
    import { liveStore, type LiveData } from "./liveData";
    import { lastUpdatedString } from "./lastUpdated";
    import { getSlashFormattedDate } from "$lib/dates";

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

    let sortedTicks: LiveData[];
    liveStore.subscribe((store) => {
        sortedTicks = Object.values(store.ticks).sort((a, b) => {
            return b.tickData.length - a.tickData.length;
        });
    });
</script>



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
                    {#each sortedTicks as tick}
                        {#if tick.tickData.length !== 0}
                            <tr class="hover:bg-base-200">
                                <td>{tick.climbData.name}</td>
                                <td>{tick.tickData.length}</td>
                                {#if tick.tickData.length === 0}
                                    <td>No recent ticks</td>
                                {:else}
                                    <td
                                        >{getSlashFormattedDate(
                                            tick.tickData.at(-1)?.createdAt,
                                        )}</td
                                    >
                                {/if}
                            </tr>
                        {/if}
                    {/each}
                </tbody>
            </table>
        </div>
    </div>
{/if}
