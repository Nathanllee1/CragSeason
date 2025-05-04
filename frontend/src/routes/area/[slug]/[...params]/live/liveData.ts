import type { Tick, TickResponse } from "$lib/mptypes";
import type { rootAreaInfo } from "$lib/kvTypes";
import { writable } from "svelte/store";
import { tweened } from "svelte/motion";
import { cubicOut } from "svelte/easing";
import { KVStore } from "$lib/indexedDBkv";
import { tick } from "svelte";
import ms from "ms"
import { batcher } from "$lib/batcher";
import { sleep } from "$lib";
import { load } from "cheerio";

type LiveData = {
    tickData: Tick[];
    climbData: rootAreaInfo;
}

type TLiveDataStore = {
    ticks: LiveData[],
    status: string,
    isLoaded: boolean,
    lastUpdated: Date,
    fetchingData: boolean,
    progress: number
}

const LIVE_DB_NAME = "liveData";

export const liveStore = liveDataStore()

function liveDataStore() {

    const defaultStore = {
        ticks: [],
        status: "",
        isLoaded: false,
        lastUpdated: new Date(),
        fetchingData: false,
        progress: 0
    }

    const { set, subscribe, update } = writable<TLiveDataStore>(defaultStore);

    function setStoreProperty<T extends keyof TLiveDataStore>(property: T, value: TLiveDataStore[T]) {

        update((state) => {
            state[property] = value;

            return state;
        })

    }

    let cancelFlag = false;

    return {
        subscribe,
        set,
        update,
        cancel: () => {
            cancelFlag = true;
            setStoreProperty("fetchingData", false);
            console.log("Cancelled");

            set(defaultStore)
        },
        initialize: async (id: string, data: rootAreaInfo[], loadFromScratch = false) => {
            cancelFlag = false;
            set(defaultStore)

            console.log("Initializing live data store...", {cancelFlag, loadFromScratch})   

            setStoreProperty("status", "Loading Ticks")

            const idDB = await KVStore.open(LIVE_DB_NAME, id);

            const whenUpdated = await idDB.get("lastUpdated");

            setStoreProperty("lastUpdated", whenUpdated)

            if (whenUpdated && (Date.now() - whenUpdated) > ms("2 days") || loadFromScratch) {
                console.log("CLearing")
                await idDB.clear();

                setStoreProperty("ticks", [])
                setStoreProperty("isLoaded", false)
            }

            const jobs = data.map((climb, idx) => {
                return async () => {
                    console.log("Fetching ticks for climb:", climb.name, {cancelFlag})
                    if (cancelFlag) {
                        return;
                    }

                    setStoreProperty("status", `Loading Ticks for ${climb.name}...`)

                    const progress = Math.floor((idx / data.length) * 100);
                    setStoreProperty("progress", progress)

                    const existingResult = await idDB.get(climb.id);

                    if (existingResult) {
                        update((storeData) => {
                            storeData.ticks.push({
                                tickData: existingResult,
                                climbData: climb
                            })

                            return storeData;
                        })

                        return;
                    }
                    
                    setStoreProperty("fetchingData", true)


                    const recentTicks = await getTick(climb)
                    await idDB.set(climb.id, recentTicks);


                    update((storeData) => {
                        storeData.ticks.push({
                            tickData: recentTicks,
                            climbData: climb
                        })

                        return storeData;
                    })

                    if (cancelFlag) {
                        return;
                    }

                }
                
            })


            await batcher(jobs, 2);

            setStoreProperty("fetchingData", false)


            setStoreProperty("isLoaded", true)
            await idDB.set("lastUpdated", Date.now());

            setStoreProperty("progress", 100)

        }
    }

}

async function getTick(climb: rootAreaInfo): Promise<Tick[]> {
    const tickURL = `https://www.mountainproject.com/api/v2/routes/${climb.id}/ticks?per_page=250&page=1`;
    
    await tick();
    const res = await fetch(tickURL);

    if (!res.ok) {
        console.error("Error fetching ticks:", res.statusText);
        return [];
    }

    const tickData: TickResponse = await res.json();

    if (tickData.data.length === 0) {
        console.log("No ticks found for climb:", climb.id);
        return [];
    }

    const recentTicks = tickData.data.filter((tick) => {
        const tickDate = new Date(tick.date);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - tickDate.getTime());
        
        return diffTime < ms("30 days")
    });

    return recentTicks;
}