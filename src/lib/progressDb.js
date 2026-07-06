// IndexedDB wrapper for manually-entered reading progress on
// currently-reading books. Same hand-rolled approach as vocabularyDb.js
// and goalsDb.js, for the same reason (no network access in this build
// environment to install and verify the `idb` package resolves).
//
// Lives in its own store, separate from the library itself, for the same
// reason Vocabulary Vault and Goals do: the parsed library gets replaced
// wholesale every time a new CSV is uploaded, but progress on a specific
// book should survive that — someone re-exporting an updated Goodreads
// file mid-book shouldn't lose their progress note.

const DB_NAME = 'shelflife-progress';
const DB_VERSION = 1;
const STORE_NAME = 'progress';

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available in this environment.'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'bookKey' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

// put (not add) — callers just want "save whatever the current value is,"
// overwriting any existing entry for this book rather than needing a
// separate create-vs-update distinction.
export async function setProgress(entry) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(entry);
    tx.oncomplete = () => resolve(entry);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllProgress() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}
