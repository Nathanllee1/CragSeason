<script lang="ts">
    import { sleep } from "$lib";
    import { clickOutside } from "$lib/clickOutside";
    import type { FeatureCollection } from "$lib/cragseason";

    import Fuse from "fuse.js";
    import type { FuseResult } from "fuse.js";
    import { onMount, tick } from "svelte";

    export let geojson: FeatureCollection;
    let fuse: Fuse<{
        id: string;
        name: string;
    }>;

    onMount(() => {
        fuse = buildSearchIndex(geojson);
    });

    function buildSearchIndex(points: FeatureCollection) {
        const items: { id: string; name: string }[] = [];

        points.features.forEach((point) => {
            items.push({
                name: point.properties.name,
                id: point.properties.url,
            });
        });

        const index = Fuse.createIndex(["name"], items);
        const options = {
            keys: ["name"],
        };
        return new Fuse(items, options, index);
    }

    let searchText = "";
    let results: FuseResult<{
        id: string;
        name: string;
    }>[] = [];

    function searchChanged() {
        const rawResults = fuse.search(searchText);

        results = rawResults.slice(0, 5);
    }

    let showResults = false;

    async function changeResult(val: boolean) {
        await sleep(10);

        showResults = val;
    }
</script>

<div use:clickOutside={() => (showResults = false)}>
    <label class="input input-sm">
        <svg
            class="h-[1em] opacity-50"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
        >
            <g
                stroke-linejoin="round"
                stroke-linecap="round"
                stroke-width="2.5"
                fill="none"
                stroke="currentColor"
            >
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.3-4.3"></path>
            </g>
        </svg>
        <input
            bind:value={searchText}
            on:focus={() => changeResult(true)}
            on:input={searchChanged}
            type="search"
            required
            placeholder="Search"
        />
    </label>
</div>

{#if showResults}
    {#if searchText.length !== 0}
        <ul class="menu bg-base-200 absolute top-16 z-30 rounded min-w-[180px]">
            {#each results as result}
                <li>
                    <a
                        on:click={() => (searchText = result.item.name)}
                        href={`/area/${result.item.id}`}>{result.item.name}</a
                    >
                </li>
            {/each}

            {#if searchText.length !== 0 && results.length == 0}
                <div>No results found</div>
            {/if}
        </ul>
    {/if}
{/if}
