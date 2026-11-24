import type { AIAnalysisResult, IssueCategory, IssueSeverity } from '../types/civic';

export interface OfflineReportDraft {
  id: 'active_draft';
  step: number;
  title: string;
  description: string;
  category: IssueCategory;
  severity: IssueSeverity;
  latitude: number;
  longitude: number;
  locality: string;
  reportedAt: string;
  imageUrl: string;
  imageDataUrl?: string;
  aiResult: AIAnalysisResult | null;
  pendingOfflineSubmit: boolean;
  savedAt: string;
}

const DB_NAME = 'janta_check_drafts';
const STORE_NAME = 'drafts';

function openDraftDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Failed to open draft store'));
  });
}

export async function saveOfflineDraft(draft: Omit<OfflineReportDraft, 'id' | 'savedAt'>): Promise<void> {
  const record: OfflineReportDraft = {
    ...draft,
    id: 'active_draft',
    savedAt: new Date().toISOString(),
  };
  try {
    const db = await openDraftDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Graceful silent fallback when storage quota/IndexedDB is restricted
  }
}

export async function loadOfflineDraft(): Promise<OfflineReportDraft | null> {
  try {
    const db = await openDraftDb();
    const result = await new Promise<OfflineReportDraft | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get('active_draft');
      req.onsuccess = () => resolve((req.result as OfflineReportDraft) || null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return result;
  } catch {
    return null;
  }
}

export async function clearOfflineDraft(): Promise<void> {
  try {
    const db = await openDraftDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete('active_draft');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Ignore
  }
}
