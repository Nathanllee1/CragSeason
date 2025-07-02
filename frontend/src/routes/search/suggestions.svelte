<script lang="ts">
    let suggestions = [
        "Find me suggestions for a multipitch 5.9 in Red Rocks",
        "Show me boulder problems V3-V4 in Bishop CA",
        `Tell me about the climb "Midnight Lightning" in Yosemite`,
        "Outline the approach beta and camping information for the Red River Gorge",
    ];

    export let askInitialQuestion: (passedInAnswer: string | undefined) => {} 

</script>

<div class="grid grid-cols-2 grid-rows-2 gap-2 mt-4">
    {#each suggestions as suggestion}
        <button
            class="font-light border-1 border-[var(--color-base-300)] hover:border-[var(--color-secondary)] hover:cursor-pointer rounded-lg p-4"
            on:click={() => askInitialQuestion(suggestion)}
        >
            {suggestion}
        </button>
    {/each}
</div>
