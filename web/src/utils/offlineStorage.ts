/**
 * IndexedDB-based offline storage for pending proof uploads
 * 오프라인 업로드 대기열을 위한 IndexedDB 스토리지
 */

import type { ProofType } from '../services/api';

const DB_NAME = 'prooflink-offline';
const DB_VERSION = 1;
const STORE_NAME = 'pending-uploads';

export interface PendingUpload {
  id: string;
  token: string;
  proofType: ProofType;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileData: ArrayBuffer;
  createdAt: string;
  retryCount: number;
  lastError?: string;
}

let dbInstance: IDBDatabase | null = null;

/**
 * Open the IndexedDB database
 */
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Failed to open IndexedDB:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('token', 'token', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });
};

/**
 * Save a file to the offline queue
 */
export const savePendingUpload = async (
  token: string,
  file: File,
  proofType: ProofType
): Promise<string> => {
  const db = await openDB();
  const id = crypto.randomUUID();

  const fileData = await file.arrayBuffer();

  const pendingUpload: PendingUpload = {
    id,
    token,
    proofType,
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
    fileData,
    createdAt: new Date().toISOString(),
    retryCount: 0,
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add(pendingUpload);

    request.onsuccess = () => resolve(id);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Get a pending upload by ID
 */
export const getPendingUpload = async (id: string): Promise<PendingUpload | null> => {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Get all pending uploads for a token
 */
export const getPendingUploadsForToken = async (token: string): Promise<PendingUpload[]> => {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('token');
    const request = index.getAll(token);

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Get all pending uploads
 */
export const getAllPendingUploads = async (): Promise<PendingUpload[]> => {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Update a pending upload (e.g., after retry failure)
 */
export const updatePendingUpload = async (
  id: string,
  updates: Partial<Pick<PendingUpload, 'retryCount' | 'lastError'>>
): Promise<void> => {
  const db = await openDB();
  const existing = await getPendingUpload(id);

  if (!existing) {
    throw new Error(`Pending upload not found: ${id}`);
  }

  const updated = { ...existing, ...updates };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(updated);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

/**
 * Remove a pending upload (after successful upload)
 */
export const removePendingUpload = async (id: string): Promise<void> => {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

/**
 * Convert PendingUpload back to File object
 */
export const pendingUploadToFile = (pending: PendingUpload): File => {
  const blob = new Blob([pending.fileData], { type: pending.fileType });
  return new File([blob], pending.fileName, { type: pending.fileType });
};

/**
 * Check if there are any pending uploads
 */
export const hasPendingUploads = async (): Promise<boolean> => {
  const pending = await getAllPendingUploads();
  return pending.length > 0;
};

/**
 * Get count of pending uploads
 */
export const getPendingUploadCount = async (): Promise<number> => {
  const pending = await getAllPendingUploads();
  return pending.length;
};

/**
 * Clear all pending uploads (use with caution)
 */
export const clearAllPendingUploads = async (): Promise<void> => {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};
