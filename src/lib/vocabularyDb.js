// A minimal IndexedDB wrapper for vocabulary entries — deliberately
// hand-rolled rather than pulling in the `idb` npm package. This app's
// sandbox build environment has no network access to actually install and
// verify a new dependency resolves correctly, so a small wrapper against
// the standard, well-documented IndexedDB API (stable across browsers) is
// the more honest choice here — same interface, nothing to leave unverified.
//
// IndexedDB itself can't be exercised in a Node test script the way the
// rest of this app's logic has been throughout — it's a browser-only API.
// The actual read/write calls below follow the standard IndexedDB
// request/transaction pattern exactly as documented on MDN; the parts that
// *can* be unit-tested (dictionary response parsing, book search
// filtering, date inheritance, export formatting) live in vocabulary.js
// and are tested there instead.

const DB_NAME = 'shelflife-vocab';
const DB_VERSION = 1;
const STORE_NAME = 'entries';

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
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('dateLearned', 'dateLearned');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

export async function addVocabEntry(entry) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).add(entry);
    tx.oncomplete = () => resolve(entry);
    tx.onerror = () => reject(tx.error);
  });
}

// put (not add) — used when appending a source book to an entry that
// already exists (a duplicate word logged from a different book), where
// the intent is "overwrite this exact record," not "insert a new one."
export async function updateVocabEntry(entry) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(entry);
    tx.oncomplete = () => resolve(entry);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllVocabEntries() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteVocabEntry(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
