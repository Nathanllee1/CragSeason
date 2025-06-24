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

type HistoricalTick = {
    type: "historical",
    tick: string
}

export type CombinedTick = HistoricalTick | {
    type: "live",
    tick: Tick
}

export type LiveData = {
    tickData: CombinedTick[];
    climbData: rootAreaInfo;
}

type TLiveDataStore = {
    ticks: Record<string, LiveData>,
    status: string,
    isLoaded: boolean,
    lastUpdated: Date,
    fetchingData: boolean,
    progress: number
}

const LIVE_DB_NAME = "liveData";

export const liveStore = liveDataStore()

function makeDefaultStore(): TLiveDataStore {
    return {
        ticks: {},
        status: "",
        isLoaded: false,
        lastUpdated: new Date(),
        fetchingData: false,
        progress: 0
    };
}

function liveDataStore() {

    const { set, subscribe, update } = writable<TLiveDataStore>(makeDefaultStore());

    function setStoreProperty<T extends keyof TLiveDataStore>(property: T, value: TLiveDataStore[T]) {

        update((state) => {
            state[property] = value;

            return state;
        })

    }

    let cancelFlag = false;
    let controller = new AbortController();

    function updateArea(newTicks: Tick[]) {

    }


    return {
        subscribe,
        set,
        update,
        cancel: () => {
            cancelFlag = true;

            console.log("Cancelled");

            controller.abort();

            set(makeDefaultStore())
        },
        clear: () => {
            set(makeDefaultStore())
        },
        setBaseData: (data: rootAreaInfo[]) => {

            for (const area of data) {

                const historicalTick = area.ticks.map(tick => ({ type: "historical", tick })) as CombinedTick[]

                update((store) => {
                    store.ticks[area.id] = {
                        climbData: area,
                        tickData: historicalTick,
                    }

                    return store;
                })
            }

        },
        getLiveData: async (id: string, data: rootAreaInfo[], loadFromScratch = false) => {
            cancelFlag = false;

            controller = new AbortController();

            setStoreProperty("status", "Loading Ticks")

            const idDB = await KVStore.open(LIVE_DB_NAME, id);

            const whenUpdated = await idDB.get("lastUpdated");

            setStoreProperty("lastUpdated", whenUpdated)

            if (whenUpdated && (Date.now() - whenUpdated) > ms("2 days") || loadFromScratch) {
                console.log("CLearing")
                await idDB.clear();


                setStoreProperty("ticks", {})
                setStoreProperty("isLoaded", false)

                liveStore.setBaseData(data)

            }

            const jobs = data.map((climb, idx) => {
                return async () => {

                    if (controller.signal.aborted) {
                        console.log("Aborted");
                        return;
                    }

                    // console.log("Fetching ticks for climb:", climb.name, {cancelFlag})
                    if (cancelFlag) {
                        return;
                    }

                    setStoreProperty("status", `Loading Ticks for ${climb.name}...`)

                    const progress = Math.floor((idx / data.length) * 100);
                    setStoreProperty("progress", progress)

                    const existingResult = await idDB.get(climb.id);

                    if (existingResult) {
                        update((storeData) => {
                            const tickObj = storeData.ticks[climb.id]
                            console.log(tickObj)
                            if (!tickObj) {
                                return storeData;
                            }

                            const combinedTicks = combineTicks(tickObj.tickData as HistoricalTick[], existingResult)

                            storeData.ticks[climb.id].tickData = combinedTicks;

                            return storeData;
                        })

                        return;
                    }

                    setStoreProperty("fetchingData", true)


                    const recentTicks = await getTick(climb)
                    await idDB.set(climb.id, recentTicks);


                    update((storeData) => {

                        const tickObj = storeData.ticks[climb.id]

                        if (!tickObj) {
                            return storeData;
                        }

                        const combinedTicks = combineTicks(tickObj.tickData as HistoricalTick[], recentTicks)

                        storeData.ticks[climb.id].tickData = combinedTicks;

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
            setStoreProperty("lastUpdated", new Date())

        }
    }

}

function combineTicks(historical: HistoricalTick[], live: Tick[]): CombinedTick[] {
    historical.sort((a, b) => new Date(a.tick).getTime() - new Date(b.tick).getTime())
    const lastDateString = historical.at(-1) ?? '';

    const lastDate = lastDateString ? new Date(lastDateString).getTime() : 0;

    const fullTicks: CombinedTick[] = historical;

    for (const liveTick of live) {
        fullTicks.push({
            type: "live",
            tick: liveTick
        })
    }

    return fullTicks;

}

async function getTick(climb: rootAreaInfo): Promise<Tick[]> {
    const tickURL = `https://www.mountainproject.com/api/v2/routes/${climb.id}/ticks?per_page=250&page=1`;

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