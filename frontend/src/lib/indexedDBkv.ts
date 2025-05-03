export class KVStore {
    private constructor(
      private db: IDBDatabase,
      private storeName: string
    ) {}

    /** Open (or create) the database and object store */
    public static async open(
        dbName: string = 'kvdb',
        storeName: string = 'store'
      ): Promise<KVStore> {
        // 1) Open with *no* explicit version → gets current version
        const db: IDBDatabase = await new Promise((resolve, reject) => {
          const req = indexedDB.open(dbName);
          req.onsuccess = () => resolve(req.result);
          req.onerror   = () => reject(req.error);
        });
    
        // 2) If the store already exists, we’re done
        if (db.objectStoreNames.contains(storeName)) {
          return new KVStore(db, storeName);
        }
    
        // 3) Otherwise, close & reopen at version+1 to trigger upgrade
        const newVersion = db.version + 1;
        db.close();
    
        const upgradedDb: IDBDatabase = await new Promise((resolve, reject) => {
          const req = indexedDB.open(dbName, newVersion);
          req.onupgradeneeded = () => {
            req.result.createObjectStore(storeName);
          };
          req.onsuccess = () => resolve(req.result);
          req.onerror   = () => reject(req.error);
        });
    
        return new KVStore(upgradedDb, storeName);
      }
  
    /** Turn an IDBRequest into a Promise */
    private static promisify<T>(req: IDBRequest<T>): Promise<T> {
      return new Promise<T>((resolve, reject) => {
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }
  
    /** Helper to run a transaction and return the request result */
    private request<T>(
      mode: IDBTransactionMode,
      action: (store: IDBObjectStore) => IDBRequest<T>
    ): Promise<T> {
      const tx = this.db.transaction(this.storeName, mode);
      const store = tx.objectStore(this.storeName);
      const req = action(store);
      return KVStore.promisify(req);
    }
  
    /** Store or overwrite a value by key */
    public set(key: IDBValidKey, value: any): Promise<IDBValidKey> {
      return this.request('readwrite', store => store.put(value, key));
    }
  
    /** Retrieve a value by key */
    public get(key: IDBValidKey): Promise<any> {
      return this.request('readonly', store => store.get(key));
    }
  
    /** Delete a value by key */
    public delete(key: IDBValidKey): Promise<void> {
      return this.request('readwrite', store => store.delete(key));
    }
  
    /** List all keys in the store */
    public keys(): Promise<IDBValidKey[]> {
      return this.request('readonly', store => store.getAllKeys());
    }
  
    /** Clear all entries */
    public clear(): Promise<void> {
      return this.request('readwrite', store => store.clear());
    }
  }
  