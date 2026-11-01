import { openDB, type IDBPDatabase } from "idb";
import type { ReceiptInput } from "@shared/validation/schemas";

const DB_NAME = "kikapu-offline";
const STORE = "receipt-drafts";

interface DraftRecord {
  id: string;
  createdAt: string;
  payload: ReceiptInput;
  imageBase64?: string;
  imageContentType?: string;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: "id" });
        }
      },
    });
  }
  return dbPromise;
}

/**
 * Saves a receipt that couldn't be submitted (no connection) so it can be
 * synced later. Each draft gets a stable client-generated id, which the
 * sync routine uses to avoid re-saving the same draft twice if the user has
 * multiple tabs open — it does NOT protect against the server independently
 * seeing two different drafts as duplicates (that's covered by the normal
 * possible-duplicate check once the sync actually submits).
 */
export async function saveOfflineDraft(payload: ReceiptInput, image?: { base64: string; contentType: string }): Promise<string> {
  const db = await getDb();
  const id = crypto.randomUUID();
  const record: DraftRecord = {
    id,
    createdAt: new Date().toISOString(),
    payload,
    imageBase64: image?.base64,
    imageContentType: image?.contentType,
  };
  await db.put(STORE, record);
  return id;
}

export async function listOfflineDrafts(): Promise<DraftRecord[]> {
  const db = await getDb();
  return db.getAll(STORE);
}

export async function deleteOfflineDraft(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE, id);
}

export async function countOfflineDrafts(): Promise<number> {
  const db = await getDb();
  return db.count(STORE);
}
