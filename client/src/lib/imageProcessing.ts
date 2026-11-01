/**
 * Canvas-based image utilities for the scan flow. Everything here runs on
 * the main thread but operates on already-small images (we downscale
 * immediately on load), so it stays fast even on mid-range Android phones.
 */

const MAX_DIMENSION = 1800; // generous for OCR accuracy, small enough to upload fast
const UPLOAD_MAX_DIMENSION = 1280; // further downscaled copy used only for the stored photo

export async function loadImageFile(file: File): Promise<HTMLImageElement> {
  const dataUrl = await fileToDataUrl(file);
  return loadImageFromSrc(dataUrl);
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Couldn't read the selected file."));
    reader.readAsDataURL(file);
  });
}

function loadImageFromSrc(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Couldn't load the image. Try a different photo."));
    img.src = src;
  });
}

export function drawToCanvas(img: HTMLImageElement, rotationDeg: number, maxDimension = MAX_DIMENSION): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  const rad = (rotationDeg * Math.PI) / 180;
  const swapDims = rotationDeg % 180 !== 0;

  let { width, height } = img;
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  width = Math.round(width * scale);
  height = Math.round(height * scale);

  canvas.width = swapDims ? height : width;
  canvas.height = swapDims ? width : height;

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(rad);
  ctx.drawImage(img, -width / 2, -height / 2, width, height);

  return canvas;
}

/** Simple linear contrast/brightness boost — helps OCR on faded thermal receipts. */
export function applyContrastBrightness(canvas: HTMLCanvasElement, contrast: number, brightness: number): HTMLCanvasElement {
  const ctx = canvas.getContext("2d")!;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const c = (contrast + 100) / 100;
  for (let i = 0; i < data.length; i += 4) {
    for (let channel = 0; channel < 3; channel++) {
      const value = data[i + channel];
      data[i + channel] = clamp((value - 128) * c + 128 + brightness, 0, 255);
    }
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function canvasToDataUrl(canvas: HTMLCanvasElement, quality = 0.85): string {
  return canvas.toDataURL("image/jpeg", quality);
}

export function canvasToBlob(canvas: HTMLCanvasElement, quality = 0.8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not export image."))), "image/jpeg", quality);
  });
}

/** Produces a smaller copy suitable for upload (kept under the ~4.5MB Vercel body limit after base64 encoding). */
export async function prepareUploadCopy(img: HTMLImageElement, rotationDeg: number): Promise<{ base64: string; contentType: string }> {
  const canvas = drawToCanvas(img, rotationDeg, UPLOAD_MAX_DIMENSION);
  const blob = await canvasToBlob(canvas, 0.75);
  const base64 = await blobToBase64(blob);
  return { base64, contentType: "image/jpeg" };
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = () => reject(new Error("Couldn't prepare the image for upload."));
    reader.readAsDataURL(blob);
  });
}

export function validateImageFile(file: File): string | null {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) return "Please choose a JPEG, PNG or WebP image.";
  if (file.size > 20 * 1024 * 1024) return "That image is too large (max 20MB).";
  return null;
}
