<script>
    import { currentPoint } from "$lib";
    import Barchart from "./barchart.svelte";

</script>

{#if $currentPoint && $currentPoint.properties}
    <div
        class={`absolute lg:w-[500px] w-full z-10 card lg:mt-[10vh] lg:mb-[3vh] lg:ml-[3vh] bottom-0 bg-base-100 rounded-t-3xl rounded-b-none lg:rounded-b-3xl`}
    >
        <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
        <div tabindex="0" class="collapse collapse-arrow border border-base-300 bg-base-200">
            <input type="checkbox" checked={true} />
            <div class="collapse-title text-xl font-medium">
                <div class="flex gap-2 justify-between">
                    <div>
                        <a
                            class="card-title link"
                            target="_blank"
                            href={`https://www.mountainproject.com/area/${$currentPoint.properties.url}`}
                            >{$currentPoint.properties.name}</a
                        >
                        <div class="text-lg">
                            <span class="text-primary">
                                {$currentPoint.properties.totalTicks.toLocaleString()}
                            </span>
                            Ticks Recorded
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
{/if}
