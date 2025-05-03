<script lang="ts">
    import { currentPoint } from "$lib";
    import { fade } from "svelte/transition";
    import Barchart from "./barchart.svelte";
    import { CollapsibleCard } from "svelte-collapsible";
    import { cardOpen } from "$lib/cardOpen";

    const tagColors = {
        Spring: "#267341",
        Winter: "#008596",
        Summer: "#eb4034",
        Fall: "#e3a74d",
        "Year Round": "#707070",
    };

    type seasonTags = keyof typeof tagColors;

    function calculateTags(monthCounts: number[]): seasonTags[] {
        // Define month ranges for each season
        const winterMonths = [11, 0, 1];
        const springMonths = [2, 3, 4];
        const summerMonths = [5, 6, 7];
        const fallMonths = [8, 9, 10];

        // Calculate counts for each season
        const winterCount = winterMonths.reduce(
            (sum, month) => sum + monthCounts[month],
            0,
        );
        const springCount = springMonths.reduce(
            (sum, month) => sum + monthCounts[month],
            0,
        );
        const summerCount = summerMonths.reduce(
            (sum, month) => sum + monthCounts[month],
            0,
        );
        const fallCount = fallMonths.reduce(
            (sum, month) => sum + monthCounts[month],
            0,
        );

        const totalTicks = Object.values(monthCounts).reduce(
            (a, b) => a + b,
            0,
        );

        // Determine if a season's ticks are above the threshold
        const isWinter = winterCount / totalTicks >= 0.2;
        const isSpring = springCount / totalTicks >= 0.2;
        const isSummer = summerCount / totalTicks >= 0.2;
        const isFall = fallCount / totalTicks >= 0.2;

        // If ticks are spread out across all seasons based on the threshold
        if (isWinter && isSpring && isSummer && isFall) {
            return ["Year Round"];
        }

        // Determine individual season tags based on the counts
        const tags: seasonTags[] = [];
        if (isWinter) tags.push("Winter");
        if (isSpring) tags.push("Spring");
        if (isSummer) tags.push("Summer");
        if (isFall) tags.push("Fall");

        return tags;
    }

    let tags: seasonTags[];

    currentPoint.subscribe((point) => {
        tags = calculateTags(JSON.parse(point?.properties?.monthTicks));
    });
</script>

<div
    class={`absolute lg:w-[500px] w-full z-10 lg:mt-[10vh] lg:mb-[3vh] lg:ml-[3vh] bottom-0 bg-base-300 rounded-t-3xl rounded-b-none lg:rounded-b-3xl`}
    in:fade
>
    <CollapsibleCard open={$cardOpen} duration={0.3} easing="ease-in-out">
        <div class="w-full rounded-3xl" slot="header">
            <div class="collapse-title text-xl font-medium">
                <div class="flex gap-2 justify-between">
                    <div>
                        <div class="flex">
                            {$currentPoint.properties?.name}
                        </div>

                        <div class="text-lg flex justify-start">
                            {#if $currentPoint.properties?.totalTicks > 20}
                                {#each tags as tag}
                                    <div
                                        class={`badge ${tagColors[tag]} text-white self-center`}
                                        style={`background: ${tagColors[tag]}`}
                                    >
                                        {tag}
                                    </div>
                                {/each}
                            {/if}
                            <div class="ml-2">
                                <span class="text-primary">
                                    {$currentPoint.properties?.totalTicks.toLocaleString()}
                                </span>
                                Ticks
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="" slot="body">
            <div class="w-full pl-4">
                
                <a
                class="btn btn-primary"
                    href={`/area/${$currentPoint.properties?.url.split("/").slice(-2)[0]}`}
                    >See more details</a
                >
            
                <a
                    class="link p-4"
                    target="_blank"
                    href={`https://www.mountainproject.com/area/${$currentPoint.properties?.url}`}
                    >View on Mountain Project</a
                >
                <Barchart />
            </div>
        </div>
    </CollapsibleCard>
</div>
