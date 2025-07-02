<script lang="ts">

    import { loadingStore } from "./history";

    let followup = "";

    export let newQuestion: () => void;
    export let askQuestion: (question: string) => void;

    async function handleSubmit() {
        const trimmed = followup.trim();
        if (!trimmed) return; // guard against blanks
        followup = ""; 

        await askQuestion(trimmed); // do the work
    }
</script>

<div class="fixed inset-x-0 bottom-0 z-10 pointer-events-none">
    <!-- full-width gradient fade -->
    <div
        class="absolute inset-x-0 bottom-0 h-24
           bg-gradient-to-t from-base-100 via-base-300/80 to-transparent"
    ></div>

    <!-- center the form to match article width -->
    <div
        class="relative mx-auto w-full max-w-screen-sm px-4 pb-4
           pointer-events-auto"
    >
        <form
            class="flex items-center"
            on:submit|preventDefault={handleSubmit}
        >
            <button
                type="button"
                class="btn btn-secondary mr-2 btn-ghost btn-outline"
                on:click={newQuestion}>New Question</button
            >
            <input
                type="text"
                bind:value={followup}
                class="input flex-1 w-full shadow-lg backdrop-blur-md"
                placeholder="Ask a follow-up"
            />
            <button type="submit" disabled={$loadingStore} class="btn btn-primary ml-2"> Send </button>
        </form>
    </div>
</div>
