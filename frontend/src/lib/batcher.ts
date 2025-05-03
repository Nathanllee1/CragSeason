
export async function batcher(
    jobs: (() => Promise<any>)[],
    batchSize: number,
) {

    for (let i = 0; i < jobs.length; i += batchSize) {

        const batchFns  = jobs.slice(i, i + batchSize);

        const batchPromises = batchFns.map((job) => job())

        // wait for all of them to finish
        const batchResults = await Promise.all(batchPromises)

    }

}