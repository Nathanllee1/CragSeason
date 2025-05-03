<script lang="ts">
    import type { FeatureProperties } from "$lib/cragseason";
    import { onMount } from "svelte";
    import type { rootAreaInfo } from "$lib/kvTypes";
    import { page } from '$app/stores';
    import { liveStore } from "./live/liveData.js";
    import LiveDataButton from "./liveDataButton.svelte";

    export let data;

    onMount(async () => {
        if (!data.areaInfo) {
            return;
        }

        liveStore.initialize(data.id, data.areaInfo.areas)
    })


</script>

<div class="max-w-screen-lg mx-auto pt-24 p-10">
    {#if data.areaInfo}
        <div class="text-4xl font-bold">
            {data.areaInfo.name}
        </div>

        <br />
        <span class="flex gap-4">
            <a
                class="btn btn-soft btn-primary btn-lg btn-ghost { $page.url.pathname === `/area/${data.id}` ? 'btn-active' : '' }"
                href={`/area/${data.id}`}
            >
                Historical Data
            </a>

            <LiveDataButton id={data.id}/>
        </span>
    {/if}

    <slot />
</div>
