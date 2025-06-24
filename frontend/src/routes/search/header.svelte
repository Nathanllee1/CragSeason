<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { fly } from "svelte/transition";

    const thingsToFind = [
        "climbing information",
        "approach beta",
        "a summary of climbs in an area",
        "information about a specific climb",
        "an itenerary for a climbing trip"
    ];

    let current = 0;
    let timer: ReturnType<typeof setInterval>;

    // lock width to the longest phrase
    const longest = thingsToFind.reduce(
        (a, b) => (a.length > b.length ? a : b),
        "",
    );

    onMount(() => {
        timer = setInterval(() => {
            current = (current + 1) % thingsToFind.length;
        }, 3000);
    });

    onDestroy(() => clearInterval(timer));
</script>

<h1 class="text-3xl mb-4 font-bold">
    <span class="text-secondary"> Find </span>

    <span class="inline-grid relative overflow-hidden">
        <!-- ghost span to force container width -->
        <span class="invisible block whitespace-nowrap" aria-hidden="true">
            {longest}
        </span>

        {#key current}
            <span
                class="absolute inset-0 flex items-center"
                in:fly={{ y: -20, duration: 400 }}
                out:fly={{ y: 20, duration: 400 }}
            >
                {thingsToFind[current]}
            </span>
        {/key}
    </span>
</h1>
