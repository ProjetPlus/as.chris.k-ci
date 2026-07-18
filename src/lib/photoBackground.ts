// Client-side background removal with automatic pearl-gray background fill.
// Uses @imgly/background-removal (WASM, runs fully offline once the model is cached).
import { removeBackground } from "@imgly/background-removal";

export const PEARL_GRAY = "#E8E6E1";

/**
 * Remove the background of a portrait photo and place the subject on a uniform
 * pearl-gray background. Returns a data URL (JPEG, quality 0.92).
 *
 * The subject is auto-cropped/framed to a 3:4 portrait ratio and centered.
 * Works fully offline after first load (WASM model is cached by the SW).
 */
export async function normalizeMemberPhoto(input: File | Blob | string): Promise<string> {
  const source = typeof input === "string" ? await (await fetch(input)).blob() : input;
  const cutoutBlob = await removeBackground(source, {
    output: { format: "image/png", quality: 1 },
  });
  const cutoutUrl = URL.createObjectURL(cutoutBlob);
  try {
    const img = await loadImage(cutoutUrl);
    // Portrait 3:4, 600x800 target for card printing.
    const targetW = 600;
    const targetH = 800;
    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = PEARL_GRAY;
    ctx.fillRect(0, 0, targetW, targetH);

    // Contain image while preserving aspect ratio, centered.
    const srcRatio = img.width / img.height;
    const dstRatio = targetW / targetH;
    let drawW: number, drawH: number;
    if (srcRatio > dstRatio) {
      drawW = targetW;
      drawH = targetW / srcRatio;
    } else {
      drawH = targetH;
      drawW = targetH * srcRatio;
    }
    const dx = (targetW - drawW) / 2;
    const dy = (targetH - drawH) / 2;
    ctx.drawImage(img, dx, dy, drawW, drawH);
    return canvas.toDataURL("image/jpeg", 0.92);
  } finally {
    URL.revokeObjectURL(cutoutUrl);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
