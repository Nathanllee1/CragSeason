<script lang="ts">
    import { currentPoint } from "$lib";
    import Barchart from "./barchart.svelte";

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
            0
        );
        const springCount = springMonths.reduce(
            (sum, month) => sum + monthCounts[month],
            0
        );
        const summerCount = summerMonths.reduce(
            (sum, month) => sum + monthCounts[month],
            0
        );
        const fallCount = fallMonths.reduce(
            (sum, month) => sum + monthCounts[month],
            0
        );

        const totalTicks = Object.values(monthCounts).reduce(
            (a, b) => a + b,
            0
        );

        // Determine if a season's ticks are above the threshold
        const isWinter = winterCount / totalTicks >= 0.2;
        const isSpring = springCount / totalTicks >= 0.2;
        const isSummer = summerCount / totalTicks >= 0.2;
        const isFall = fallCount / totalTicks >= 0.2;

        console.log(winterCount, springCount, summerCount, fallCount);

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
        console.log(tags);
    });
</script>

<div
    class={`absolute lg:w-[500px] w-full z-10 card lg:mt-[10vh] lg:mb-[3vh] lg:ml-[3vh] bottom-0 bg-base-100 rounded-t-3xl rounded-b-none lg:rounded-b-3xl`}
>
    <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
    <div
        tabindex="0"
        class="collapse collapse-arrow border border-base-300 bg-base-200"
    >
        <input type="checkbox" checked={true} />
        <div class="collapse-title text-xl font-medium">
            <div class="flex gap-2 justify-between">
                <div>
                    <div class="flex w-full">
                        <a
                            class="card-title link z-20"
                            target="_blank"
                            href={`https://www.mountainproject.com/area/${$currentPoint.properties?.url}`}
                            >{$currentPoint.properties?.name}</a
                        >
                    </div>

                    <div class="text-lg">
                        {#if $currentPoint.properties?.totalTicks > 20}
                            {#each tags as tag}
                                <div
                                    class={`badge ${tagColors[tag]} text-white`}
                                    style={`background: ${tagColors[tag]}`}
                                >
                                    {tag}
                                </div>
                            {/each}
                        {/if}
                        <span class="text-primary">
                            {$currentPoint.properties?.totalTicks.toLocaleString()}
                        </span>
                        Ticks
                    </div>
                </div>
            </div>
        </div>
        <div class="collapse-content">
            <div class="w-full">
                <Barchart />
            </div>
        </div>
    </div>
</div>
