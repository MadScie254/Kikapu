/**
 * Thin wrapper around Tesseract.js. The library is dynamically imported so
 * its ~2MB core + language data are only ever downloaded when a user
 * actually opens the Scan page; never on the homepage or other app pages.
 * Tesseract.js runs its recognition in its own Web Worker internally, so
 * this never blocks the main thread / UI.
 */
let workerPromise: Promise<import("tesseract.js").Worker> | null = null;

async function getWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng");
      return worker;
    })();
  }
  return workerPromise;
}

export interface OcrProgress {
  status: string;
  progress: number; // 0-1
}

export async function recognizeReceiptText(
  imageSource: string | HTMLCanvasElement,
  onProgress?: (p: OcrProgress) => void
): Promise<string> {
  const worker = await getWorker();
  if (onProgress) {
    // tesseract.js v5 reports progress via the logger option at worker-creation time only in
    // some builds; we poll-free fallback by emitting coarse milestones here so the UI always
    // has something meaningful to show even if granular progress isn't available.
    onProgress({ status: "recognizing text", progress: 0.1 });
  }
  const { data } = await worker.recognize(imageSource);
  onProgress?.({ status: "done", progress: 1 });
  return data.text;
}

/** Call when leaving the scan flow for good (e.g. app unmount) to free the worker's memory. */
export async function terminateOcrWorker() {
  if (!workerPromise) return;
  const worker = await workerPromise;
  await worker.terminate();
  workerPromise = null;
}
