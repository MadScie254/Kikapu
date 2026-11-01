import { put, del, head } from "@vercel/blob";
import { randomUUID } from "node:crypto";

export const BLOB_CONFIGURED = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/**
 * Receipt images are never stored under a guessable path (no user id, no
 * sequential id) and the resulting Blob URL is never sent to the browser
 * directly — only the path is kept in the DB, and the browser only ever
 * fetches it through GET /api/receipts/:id/image, which checks household
 * ownership first. See lib/http.ts assertOwnership.
 */
export async function uploadReceiptImage(
  householdId: string,
  buffer: Buffer,
  contentType: string
): Promise<{ url: string; pathname: string }> {
  if (!BLOB_CONFIGURED) {
    throw new Error("Blob storage is not configured. Set BLOB_READ_WRITE_TOKEN to enable receipt image storage.");
  }
  if (!ALLOWED_TYPES.has(contentType)) {
    throw new Error("Unsupported image type. Use JPEG, PNG or WebP.");
  }
  if (buffer.byteLength > MAX_IMAGE_BYTES) {
    throw new Error("Image is too large (max 8MB).");
  }
  const ext = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
  const pathname = `receipts/${householdId}/${randomUUID()}.${ext}`;
  const blob = await put(pathname, buffer, {
    access: "public", // Vercel Blob has no private-ACL tier today; see note above — real access control
    contentType, // is enforced at the API layer (ownership-checked proxy route), not by the storage URL.
    addRandomSuffix: false,
  });
  return { url: blob.url, pathname: blob.pathname };
}

export async function deleteReceiptImage(pathname: string): Promise<void> {
  if (!BLOB_CONFIGURED) return;
  try {
    await del(pathname);
  } catch {
    // Already deleted or never existed — not fatal.
  }
}

export async function blobExists(pathname: string): Promise<boolean> {
  if (!BLOB_CONFIGURED) return false;
  try {
    await head(pathname);
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolves a stored blob pathname to its fetchable URL, server-side only.
 * The browser never calls this directly — the client only ever holds the
 * opaque `pathname` it got back from the upload endpoint, never the URL.
 */
export async function resolveBlobUrl(pathname: string): Promise<string | null> {
  if (!BLOB_CONFIGURED) return null;
  try {
    const meta = await head(pathname);
    return meta.url;
  } catch {
    return null;
  }
}
