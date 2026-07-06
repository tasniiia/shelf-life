// IndexedDB wrapper for Reading Goals — same hand-rolled approach as
// vocabularyDb.js, for the same reason: no network access in this build
// environment to install and verify the `idb` package resolves correctly.
// A growing collection of independent records with real CRUD needs
// (goals get created, updated on each streak check, and deleted), which
// is exactly the shape IndexedDB fits better than localStorage — same
// reasoning that put Vocabulary Vault in IndexedDB and the library itself
// in localStorage.

const DB_NAME = 'shelflife-goals';
const DB_VERSION = 1;
const STORE_NAME = 'goals';

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
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

export async function addGoal(goal) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).add(goal);
    tx.oncomplete = () => resolve(goal);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllGoals() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

// Used for streak-rollover updates — overwrites the existing record with
// the same id (put, not add, so it doesn't throw on an existing key).
export async function updateGoal(goal) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(goal);
    tx.oncomplete = () => resolve(goal);
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteGoal(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
