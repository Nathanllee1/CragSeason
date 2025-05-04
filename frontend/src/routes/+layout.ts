import { fetchPoints } from '$lib/map';
import type { FeatureCollection } from '$lib/cragseason.d.ts';
import type { LayoutLoad } from './$types';


export const ssr = false;



export const load: LayoutLoad = async () => {
    const points: FeatureCollection = await fetchPoints();

    return {
        props: {
            points
        }
    };
}