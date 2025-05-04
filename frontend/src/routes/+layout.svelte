<script>
    import "../app.css";
    import Help from "./help.svelte";
    import Search from "./search.svelte";

    export let data;
</script>


<div class="absolute z-10 w-screen bg-base-300 navbar">
    <div class="flex flex-1 gap-2 align-baseline navbar-start">
        <a href="/" class="text-2xl font-extrabold text-primary">Crag Season</a>
        <div class="self-center mt-1 hidden lg:block">
            Explore what season people climb
        </div>
    </div>

    <div class="navbar-center">
        <Search geojson={data.props.points} />

    </div>

    <div class="navbar-end">
        <div class="font-light text-sm flex-none hidden lg:block">
            Data sourced from <a
                class="link"
                href="https://www.mountainproject.com/">Mountain Project</a
            > ticks
        </div>
        <button
            class="btn btn-outline btn-primary mr-2 ml-2"
            onclick="my_modal_2.showModal()">Help</button
        >
    </div>
    
</div>

<Help />

<slot />
