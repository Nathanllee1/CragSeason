async function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function retry<func extends (...args: any) => any>(
    fn: func, 
    retries: number = 3, 
    backoff: number = 500, 
    ...args: Parameters<func>
): Promise<ReturnType<func>> {
    let attempts = 0;
    while (attempts < retries) {
        console.log(args)
        try {
            return await fn(args);
        } catch (error) {
            console.log(error, retries, fn, args)
            if (attempts === retries - 1) throw error;
            attempts++;
            console.error(error)
            await delay(backoff * Math.pow(2, attempts));
        }
    }
    throw new Error("Maximum retries reached" + JSON.stringify(args));
}


class Deferred<T> {
    promise: Promise<T>;
    resolve: (value: T | PromiseLike<T>) => void = () => {};
    reject: (reason?: any) => void = () => {};

    constructor() {
        this.promise = new Promise<T>((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        });
    }
}

export class Batcher {
    interval
    queue: {
        fn: (...args: any) => any,
        args: []
        promise: Deferred<any>
    }[] = []

    constructor(interval: number) {
        this.interval = interval
        setInterval(async () => {
            if (this.queue.length === 0) {
                return
            }

            const {fn, promise, args} = this.queue.pop()!

            // console.log(args, this.queue.length)
            // console.log(new Array(this.queue.length).fill("|").join(""))
            try {
                // promise.resolve(await retry(fn, 3, 500, ...args))
                promise.resolve(await fn(...args))

            } catch(e) {
                console.error(e)
                promise.reject()
            }

        }, this.interval)
    }

    enqueue<func extends (...args: any) => any>(fn: func, ...args: Parameters<func>) {
        const promise = new Deferred<ReturnType<func>>()

        this.queue.push({fn, promise, args})

        return promise.promise
    }

    reset() {

    }
}

