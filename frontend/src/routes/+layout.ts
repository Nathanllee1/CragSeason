import { fetchPoints } from '$lib/map';
import type { FeatureCollection } from '$lib/cragseason.d.ts';
import type { LayoutServerLoad } from './$types';


export const ssr = false;



export const load: LayoutServerLoad = async () => {
    const points: FeatureCollection = await fetchPoints();

    return {
        props: {
            points
        }
    };
}