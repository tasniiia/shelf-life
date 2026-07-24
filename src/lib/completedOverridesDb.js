// IndexedDB wrapper for books manually marked "Finished" through
// ShelfLife itself, rather than reflected in the uploaded CSV yet. Same
// hand-rolled pattern as goalsDb.js / progressDb.js / vocabularyDb.js.
//
// This is the app's first local "write" that actually contradicts the
// CSV rather than just supplementing it — Goodreads itself never learns
// about this. See libraryOverrides.js for how these get merged into (and
// eventually reconciled against) the real data.

const DB_NAME = 'shelflife-completed-overrides';
const DB_VERSION = 1;
const STORE_NAME = 'overrides';

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

export async function addOverride(override) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(override); // put — re-marking finished just refreshes the date
    tx.oncomplete = () => resolve(override);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllOverrides() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteOverride(bookKey) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(bookKey);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
