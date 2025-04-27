function VocabularyDB() {
    this.db = null;

    this.open = (dbName) => {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(dbName, 1);

            req.onerror = _ => {
                console.log("ERRROR")
                reject("Failed to open database");
            };

            req.onsuccess = ev => {
                this.db = ev.target.result;
                resolve(this.db);
            };

            req.onupgradeneeded = ev => {
                this.db = ev.target.result;

                if (!this.db.objectStoreNames.contains('categories')) {
                    const categoryStore = this.db.createObjectStore('categories', { keyPath: 'id' });
                    categoryStore.createIndex('de', 'de', { unique: false });
                }

                if (!this.db.objectStoreNames.contains('vocabs')) {
                    const vocabStore = this.db.createObjectStore('vocabs', { keyPath: 'id' });
                    vocabStore.createIndex('categoryId', 'categoryId', { unique: false });
                    vocabStore.createIndex('romaji', 'romaji', { unique: false });
                    vocabStore.createIndex('writing', 'writing', { unique: false });
                    vocabStore.createIndex('de', 'de', { unique: false });
                }

                if (!this.db.objectStoreNames.contains('migrations')) {
                    const vocabStore = this.db.createObjectStore('migrations', { keyPath: 'name' });
                }

                if (!this.db.objectStoreNames.contains('statistics')) {
                    const statisticsStore = this.db.createObjectStore('statistics', { keyPath: 'id', autoIncrement: true });
                    statisticsStore.createIndex('date', 'date', { unique: false });
                    statisticsStore.createIndex('vocabId', 'vocabId', { unique: false });
                    statisticsStore.createIndex('successCount', 'successCount', { unique: false });
                    statisticsStore.createIndex('failedCount', 'failedCount', { unique: false });
                    statisticsStore.createIndex('categoryId', 'categoryId', { unique: false });

                    statisticsStore.createIndex('search_key', ['date', 'vocabId'], { unique: false });
                }
            };
        });
    }

    /** Migrates the database. */
    this.migrate = async () => {
        const migrationIndex = await fetch("migrations/migrations.json").then(res => res.json());
        for (const element of migrationIndex) {
            const migration = await this._getMigration(element);
            if(!migration) {
                const migration = await fetch("migrations/" + element).then(res => res.json());
                for (const category of migration.categories)
                    await this.patchCategory(category);

                for (const vocab of migration.vocabs)
                    await this.patchVocab(vocab);

                await this._saveMigration({name: element});
            }
        }
    }

    this._patchObject = (objectStore, obj) => {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(objectStore, 'readwrite');
            const store = tx.objectStore(objectStore);

            if(obj.id) {
                const request = store.get(obj.id);
                request.onsuccess = event => {
                    var storedObj = event.target.result;
                    if(storedObj) {
                        for (const key in obj) {
                            if(key !== "id") {
                                storedObj[key] = obj[key];
                            }
                        }
                    } else {
                        storedObj = obj;
                    }
    
                    const request = store.put(storedObj);
            
                    request.onsuccess = () => resolve();
                    request.onerror = () => reject(objectStore + " couldn't be saved");
                };
                request.onerror = () => reject(objectStore + " couldn't be loaded");
            } else {
                const request = store.put(obj);
            
                request.onsuccess = () => resolve();
                request.onerror = () => reject(objectStore + " couldn't be saved");
            }
        })
    };

    this.patchCategory = category => {
        return this._patchObject("categories", category);
    };
    
    this.patchVocab = vocab => {
        return this._patchObject("vocabs", vocab);
    };

    this.patchStatistic = statistic => {
        return this._patchObject("statistics", statistic);
    };

    this._saveObject = (objectStore, obj) => {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(objectStore, 'readwrite');
            const store = tx.objectStore(objectStore);
            const request = store.put(obj);
        
            request.onsuccess = () => resolve();
            request.onerror = () => reject(objectStore + " couldn't be saved");
        });
    }

    this._getObject = (objectStore, id) => {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(objectStore, 'readonly');
            const store = tx.objectStore(objectStore);
        
            const request = store.get(id);
        
            request.onsuccess = (event) => {
              const result = event.target.result;
              if (result) {
                resolve(result);
              } else {
                resolve(null);
              }
            };
        
            request.onerror = () => reject(objectStore + " couldn't be searched");
        });
    }

    this._getMigration = migration => {
        return this._getObject("migrations", migration);
    }

    this.getStatistic = (date, vocab) => {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction("statistics", 'readonly');
            const store = tx.objectStore("statistics");
            const index = store.index('search_key');

            const request = index.get([date, vocab]);
        
            request.onsuccess = (event) => {
              const result = event.target.result;
              if (result) {
                resolve(result);
              } else {
                resolve(null);
              }
            };
        
            request.onerror = () => reject("statistic couldn't be searched");
        });
    }

    this._saveMigration = migration => {
        return this._saveObject("migrations", migration);
    }

    this.saveCategory = category => {
        return this._saveObject("categories", category);
    }

    this.saveVocab = vocab => {
        return this._saveObject("vocabs", vocab);
    }

    this.getVocabsByCategory = categoryId => {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('vocabs', 'readonly');
            const store = tx.objectStore('vocabs');
            const index = store.index('categoryId');

            const vocabs = [];
            const request = index.openCursor(IDBKeyRange.only(categoryId));
        
            request.onsuccess = (event) => {
              const cursor = event.target.result;
              if (cursor) {
                vocabs.push(cursor.value);
                cursor.continue();
              } else {
                resolve(vocabs);
              }
            };
        
            request.onerror = () => reject("Vocabularies couldn't be loaded");
        });
    };

    this._getAllObjects = objectStore => {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(objectStore, 'readonly');
            const store = tx.objectStore(objectStore);

            const request = store.getAll();
            request.onsuccess = (event) => {
                const all = event.target.result;
                resolve(all);
            };
        
            request.onerror = () => reject(objectStore + " couldn't be loaded");
        });
    }

    this.getAllVocabs = () => {
        return this._getAllObjects("vocabs");
    }

    this.getAllCategories = () => {
        return this._getAllObjects("categories");
    }

    this.generateDiagramStatistics = () => {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction("statistics", 'readwrite');
            const store = tx.objectStore("statistics");

            const grouped = {};
            const request = store.openCursor();
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    const record = cursor.value;
                    const date = record.date;
            
                    if (!grouped[date])
                        grouped[date] = {successCount: 0, failedCount: 0};
                    
                    grouped[date].successCount += record.successCount;
                    grouped[date].failedCount += record.failedCount;
            
                    cursor.continue();
                } else {
                    resolve(grouped);
                }
            };
          
              request.onerror = () => reject('Failed to read statistics');
        });
    }
}