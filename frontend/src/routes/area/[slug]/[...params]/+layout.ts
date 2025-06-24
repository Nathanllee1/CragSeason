import type { LayoutLoad } from '../$types';
import { KV } from "$lib/kv";

function getCurrentArea(slug: string) {

}



export const load: LayoutLoad = async ({params, fetch, url}) => {
    
    const kv = new KV();
    await kv.init();
    const areaId = params.slug;
    console.time()
    const areaInfo = await kv.get(areaId, fetch, url.origin);
    console.timeEnd()

    return {
        id: areaId,
        areaInfo
    }
}