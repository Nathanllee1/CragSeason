<script lang="ts">
    export let newQuestion: () => {};
</script>

<div class="fixed inset-x-0 bottom-0 z-10 pointer-events-none">
    <!-- full-width gradient fade -->
    <div
        class="absolute inset-x-0 bottom-0 h-24
           bg-gradient-to-t from-base-100 via-base-300/80 to-transparent "
    ></div>

    <!-- center the form to match article width -->
    <div
        class="relative mx-auto w-full max-w-screen-sm px-4 pb-4
           pointer-events-auto"
    >
        <form class="flex items-center">
            <button
                class="btn btn-secondary mr-2 btn-ghost btn-outline"
                on:click={newQuestion}>New Question</button
            >
            <input
                type="text"
                class="input flex-1 w-full shadow-lg backdrop-blur-md"
                placeholder="Ask a follow-up"
            />
            <button type="submit" class="btn btn-primary ml-2"> Send </button>
        </form>
    </div>
</div>
