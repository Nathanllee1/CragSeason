<script>
    import LiveData from "./liveData.svelte";

    export let data;
</script>

{#if data.areaInfo}
    <LiveData data={data.areaInfo.areas} id={data.id} />
{/if}
