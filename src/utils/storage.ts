/**
 * IndexedDB storage utility for storing generated voice clips with large audio payloads.
 * IndexedDB has gigabyte capacity and does not hit the 5MB localStorage quota.
 */

const DB_NAME = 'VocalCraftStudioDB';
const DB_VERSION = 1;
const STORE_NAME = 'voice_clips';

export interface StoredVoiceClip {
  id: string;
  title: string;
  text: string;
  audioBase64: string;
  mimeType: string;
  createdAt: number;
  durationSeconds?: number;
  voice: string;
  accent: string;
  style: string;
  tone: string;
  pace: string;
  pitch: string;
  emotion: string;
  wordCount: number;
  characterCount: number;
  isFavorite?: boolean;
  isDialogue?: boolean;
  dialogueInfo?: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB is not supported in this browser.'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('isFavorite', 'isFavorite', { unique: false });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error('Failed to open IndexedDB.'));
    };
  });
}

/**
 * Saves all clips to IndexedDB safely
 */
export async function saveClipsToIndexedDB(clips: StoredVoiceClip[]): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    // Put each clip (limit to recent 50 to keep things tidy)
    const recent = clips.slice(0, 50);
    for (const clip of recent) {
      store.put(clip);
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IndexedDB save failed:', err);
  }
}

/**
 * Loads all clips from IndexedDB sorted by creation date descending
 */
export async function loadClipsFromIndexedDB(): Promise<StoredVoiceClip[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('createdAt');

    return new Promise((resolve, reject) => {
      const request = index.openCursor(null, 'prev');
      const results: StoredVoiceClip[] = [];

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (err) {
    console.warn('IndexedDB load failed:', err);
    return [];
  }
}

/**
 * Deletes a single clip from IndexedDB
 */
export async function deleteClipFromIndexedDB(id: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
  } catch (err) {
    console.warn('IndexedDB delete failed:', err);
  }
}

/**
 * Clears all clips from IndexedDB
 */
export async function clearAllClipsFromIndexedDB(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.clear();
  } catch (err) {
    console.warn('IndexedDB clear failed:', err);
  }
}
