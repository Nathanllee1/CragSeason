import type { FeatureCollection } from '$lib/cragseason.d.ts';
import type { LayoutLoad } from './$types';


// export const ssr = false;


export const load: LayoutLoad = async ({fetch }) => {
    const res = await fetch('/all2.geojson');

    const points = await res.json();

    return {
        props: {
            points
        }
    };
}