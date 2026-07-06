// Lets a Pro user choose which 3 specific insight cards surface in their
// shareable summary, instead of always relying on automatic notability-
// based selection. A single small array (up to 3 slide IDs), so
// localStorage is the right fit here — same reasoning as the library
// itself: one cohesive value, not a growing collection of independent
// records.

const STORAGE_KEY = 'shelflife.customSummarySelection';
const MAX_SELECTIONS = 3;

export function getCustomSummarySelection() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : null;
  } catch (err) {
    console.warn('[ShelfLife] Could not read custom summary selection:', err.message || err);
    return null;
  }
}

export function setCustomSummarySelection(slideIds) {
  try {
    const trimmed = slideIds.slice(0, MAX_SELECTIONS);
    if (trimmed.length === 0) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    }
    return true;
  } catch (err) {
    console.warn('[ShelfLife] Could not save custom summary selection:', err.message || err);
    return false;
  }
}

export { MAX_SELECTIONS };
