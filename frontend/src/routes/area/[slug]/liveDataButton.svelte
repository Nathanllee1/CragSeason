<script lang="ts">
    import { page } from "$app/stores";
    import { cubicInOut } from "svelte/easing";
    import { tweened } from "svelte/motion";
    import { liveStore } from "./live/liveData";
    import { get } from "svelte/store";
    export let id;

    const tweenedProgress = tweened(0, {
        duration: 1,
        easing: cubicInOut,
    });

    liveStore.subscribe(({ progress }) => {
        tweenedProgress.set(progress);
    });

    liveStore.subscribe((data) => {
        console.log(data.isLoaded);
    });
</script>

<a
    class="btn btn-soft btn-secondary btn-lg btn-ghost {$page.url.pathname ===
    `/area/${id}/live`
        ? 'btn-active'
        : ''}"
    href={`/area/${id}/live`}
>
    Live Data

    {#if !$liveStore.isLoaded}
        <div
            class="radial-progress text-primary"
            style={`--value:${$tweenedProgress}; --size:1.2em; --thickness:.2em`}
            aria-valuenow={$tweenedProgress}
            role="progressbar"
        ></div>
    {:else}
        <input type="checkbox" checked={true} class="checkbox checkbox-primary" />
    {/if}
</a>
