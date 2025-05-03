<script lang="ts">
    import { onMount } from "svelte";

    let show = false;
    let dialog: HTMLDialogElement;

    onMount(() => {

        const hasOpened = localStorage.getItem("hasOpened")

        if (hasOpened) {
            return;
        }

        dialog.setAttribute("open", "")
        localStorage.setItem("hasOpened", "true")

    });

</script>


<dialog bind:this={dialog} id="my_modal_2" class="modal z-30" >
    <div class="modal-box card bg-base-300 max-w-lg">
        <div class="">
            <h3 class="font-bold text-2xl text-primary">Crag Season ⛰️</h3>
            <h2>Explore what season people climb at different crags!</h2>
            <img src="/overview.png" alt="overview of app" class="py-4" />

            <div>
                Each point is a climbing crag. The <span class="text-red-500"
                    >color</span
                > represents which season the crag is most popular in.
            </div>
            
            <br>

            <div
                class="bg-gradient-to-r from-[#EB4034] to-[#00D5FF] w-full h-2 rounded"
            />
            <div class="flex justify-between">
                <div>Summer</div>
                <div>Winter</div>
            </div>
            <br />
            
            <div class="collapse bg-base-200">
                <input type="checkbox" />
                <div class="collapse-title text-xl font-medium">FAQ</div>
                <div class="collapse-content">
                    <p class="font-bold">Where is the data from?</p>
                    <p>
                        The data was sourced from people recording, or
                        "ticking", the climbs they've done on Mountain Project
                    </p>

                    <div class="divider" />

                    <p class="font-bold">Who made this?</p>
                    <p>
                        This was made by Nathan Lee. Reach out for any
                        questions or suggestions <a
                            href="mailto:nathan.l.lee123@gmail.com"
                            target="_blank"
                            class="link">here</a
                        >. You can find the source
                        <a
                            class="link"
                            target="_blank"
                            href="https://github.com/Nathanllee1/CragSeason"
                            >here</a
                        >
                    </p>

                </div>
            </div>
        </div>
        <br>
        <form method="dialog" class="">
            <button class="btn btn-primary">Explore!</button>
        </form>
    </div>
    <form method="dialog" class="modal-backdrop backdrop-blur-sm">
        <button>close</button>
    </form>
</dialog>
