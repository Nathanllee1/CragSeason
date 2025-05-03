import type { LayoutLoad } from './$types';
import { KV } from "$lib/kv";

function getCurrentArea(slug: string) {

}

export const load: LayoutLoad = async (data) => {
    
    const kv = new KV();
    await kv.init();
    const areaId = data.params.slug;
    const areaInfo = await kv.get(areaId);

    console.log("Area info", areaInfo);

    return {
        id: areaId,
        areaInfo
    }
}