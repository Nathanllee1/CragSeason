import type { AreaPayload, IndexEntry, rootAreaInfo } from "./kvTypes";


export class KV {

    index: Record<string, IndexEntry> = {};
    dataFileUrl: string = "/kv/data.kv"; 
    indexFileUrl: string = "/kv/index.json";
    hashUrl: string = "/kv/data.kv.hash";

    async init() {

        // check if local storage has a cached index
        const index = localStorage.getItem("index");
        const hash = localStorage.getItem("indexHash");

        // get hash from server
        const hashRes = await fetch(this.hashUrl);
        if (!hashRes.ok) {
            throw new Error("Failed to load hash");
        }
        const serverHash = await hashRes.text();

        if (hash === serverHash && index) {
            this.index = JSON.parse(index);
            return;

        }

        localStorage.setItem("indexHash", serverHash);
        localStorage.removeItem("index");

        // load index from server
        const res = await fetch(this.indexFileUrl);
        if (!res.ok) {
            throw new Error("Failed to load index");
        }

        const data = await res.json();
        this.index = data;

        localStorage.setItem("index", JSON.stringify(data));
    }

    async get(key: string): Promise< AreaPayload| null> {
        if (!this.index[key]) {
            console.log("Key not found in index", key);
            return null;
        }

        const { o: offset, l: length } = this.index[key];
        const rangeHeader = `bytes=${offset}-${offset + length - 1}`;

        const response = await fetch(this.dataFileUrl, {
            headers: { Range: rangeHeader }
        });
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const json = await response.json()// await response.json();

        return json;
    }

}