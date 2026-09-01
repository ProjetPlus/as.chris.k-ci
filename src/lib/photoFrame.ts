/**
 * Normalise une photo de membre pour qu'elle remplisse TOUJOURS le cadre de la
 * carte : on retire les bandes uniformes (blanc / gris perle) autour du sujet,
 * puis on recadre au ratio exact du cadre (cover, centré, léger biais vers le
 * haut pour garder le visage). Résultat : plus jamais d'espace vide.
 */

const cache = new Map<string, string>();

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("photo illisible"));
    img.src = src;
  });
}

/** Détecte les bordures quasi-uniformes (fond studio) et renvoie la zone utile. */
function contentBox(data: Uint8ClampedArray, w: number, h: number) {
  const at = (x: number, y: number) => (y * w + x) * 4;
  const corners = [at(0, 0), at(w - 1, 0), at(0, h - 1), at(w - 1, h - 1)];
  const bg = corners
    .reduce((acc, i) => [acc[0] + data[i], acc[1] + data[i + 1], acc[2] + data[i + 2]], [0, 0, 0])
    .map((v) => v / corners.length);
  const tol = 26;
  const isBg = (i: number) =>
    data[i + 3] < 16 ||
    (Math.abs(data[i] - bg[0]) < tol && Math.abs(data[i + 1] - bg[1]) < tol && Math.abs(data[i + 2] - bg[2]) < tol);

  const rowIsBg = (y: number) => {
    let n = 0;
    for (let x = 0; x < w; x += 2) if (isBg(at(x, y))) n++;
    return n / Math.ceil(w / 2) > 0.97;
  };
  const colIsBg = (x: number) => {
    let n = 0;
    for (let y = 0; y < h; y += 2) if (isBg(at(x, y))) n++;
    return n / Math.ceil(h / 2) > 0.97;
  };

  let top = 0, bottom = h - 1, left = 0, right = w - 1;
  while (top < bottom && rowIsBg(top)) top++;
  while (bottom > top && rowIsBg(bottom)) bottom--;
  while (left < right && colIsBg(left)) left++;
  while (right > left && colIsBg(right)) right--;

  // garde-fou : ne jamais rogner plus de 45 % de l'image
  if (right - left < w * 0.55 || bottom - top < h * 0.55) return { x: 0, y: 0, w, h };
  return { x: left, y: top, w: right - left + 1, h: bottom - top + 1 };
}

export async function normalizeFramedPhoto(
  src: string,
  aspect = 176 / 220,
  outWidth = 704,
): Promise<string> {
  if (!src) return "";
  const key = `${src.length}:${src.slice(-64)}:${aspect.toFixed(3)}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const img = await loadImage(src);
  const sw = img.naturalWidth || img.width;
  const sh = img.naturalHeight || img.height;
  if (!sw || !sh) return src;

  const probe = document.createElement("canvas");
  probe.width = sw;
  probe.height = sh;
  const pctx = probe.getContext("2d", { willReadFrequently: true });
  if (!pctx) return src;
  pctx.drawImage(img, 0, 0);

  let box = { x: 0, y: 0, w: sw, h: sh };
  try {
    box = contentBox(pctx.getImageData(0, 0, sw, sh).data, sw, sh);
  } catch {
    /* image cross-origin non lisible : on garde l'image entière */
  }

  // recadrage "cover" au ratio du cadre, centré horizontalement, biais haut
  let cw = box.w;
  let ch = cw / aspect;
  if (ch > box.h) {
    ch = box.h;
    cw = ch * aspect;
  }
  const cx = box.x + (box.w - cw) / 2;
  const cy = Math.max(box.y, box.y + (box.h - ch) * 0.35);

  const out = document.createElement("canvas");
  out.width = outWidth;
  out.height = Math.round(outWidth / aspect);
  const ctx = out.getContext("2d");
  if (!ctx) return src;
  ctx.fillStyle = "#E8E6E1";
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, cx, cy, cw, ch, 0, 0, out.width, out.height);

  const url = out.toDataURL("image/jpeg", 0.9);
  cache.set(key, url);
  return url;
}
