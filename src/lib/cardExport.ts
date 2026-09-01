import { toJpeg, toPng } from "html-to-image";
import jsPDF from "jspdf";
import { CARD_H_MM, CARD_H_PX, CARD_W_MM, CARD_W_PX } from "@/components/MemberCard";

// A5 landscape
const A5_W = 210;
const A5_H = 148;

/** ~600 dpi sur une CR-80 : largement suffisant pour la lecture du QR. */
const EXPORT_RATIO = 2.5;
const JPEG_QUALITY = 0.92;

type Capture = { data: string; format: "JPEG" | "PNG" };

const baseOpts = (pixelRatio: number) => ({
  pixelRatio,
  width: CARD_W_PX,
  height: CARD_H_PX,
  cacheBust: true,
  skipFonts: false,
  backgroundColor: "#FFFFFF",
  style: { transform: "none", transformOrigin: "top left", margin: "0", boxShadow: "none" },
});

const bytesOf = (dataUrl: string) => Math.ceil((dataUrl.length - dataUrl.indexOf(",") - 1) * 0.75);

/**
 * html-to-image clone le nœud dans un foreignObject SVG : le rendu est
 * strictement identique à l'aperçu. On exporte en JPEG haute résolution pour
 * garder des PDF légers (< 1 Mo) sans perdre la netteté du QR.
 */
export async function captureCardPng(node: HTMLElement): Promise<string> {
  const opts = baseOpts(EXPORT_RATIO);
  await toPng(node, opts); // 1re passe : images / polices
  return toPng(node, opts);
}

async function captureCard(node: HTMLElement): Promise<Capture> {
  const opts = baseOpts(EXPORT_RATIO);
  await toJpeg(node, { ...opts, quality: JPEG_QUALITY }); // 1re passe de préchauffage
  let data = await toJpeg(node, { ...opts, quality: JPEG_QUALITY });
  // Filet de sécurité : si la face dépasse ~450 Ko, on baisse d'un cran.
  if (bytesOf(data) > 450_000) {
    data = await toJpeg(node, { ...baseOpts(2), quality: 0.86 });
  }
  return { data, format: "JPEG" };
}

function drawCutMarks(doc: jsPDF, x: number, y: number) {
  doc.setDrawColor(160);
  doc.setLineWidth(0.1);
  const m = 3;
  [[x, y], [x + CARD_W_MM, y], [x, y + CARD_H_MM], [x + CARD_W_MM, y + CARD_H_MM]].forEach(([px, py]) => {
    doc.line(px - m, py, px - 1, py);
    doc.line(px + 1, py, px + m, py);
    doc.line(px, py - m, px, py - 1);
    doc.line(px, py + 1, px, py + m);
  });
}

export async function exportCardPdf(
  front: HTMLElement,
  back: HTMLElement,
  fileName: string,
  format: "cr80" | "a5" = "cr80",
) {
  const f = await captureCard(front);
  const b = await captureCard(back);
  const add = (doc: jsPDF, img: Capture, x: number, y: number) =>
    doc.addImage(img.data, img.format, x, y, CARD_W_MM, CARD_H_MM, undefined, "FAST");

  if (format === "cr80") {
    const doc = new jsPDF({ unit: "mm", format: [CARD_W_MM, CARD_H_MM], orientation: "landscape", compress: true });
    add(doc, f, 0, 0);
    doc.addPage([CARD_W_MM, CARD_H_MM], "landscape");
    add(doc, b, 0, 0);
    doc.save(fileName);
    return;
  }
  const doc = new jsPDF({ unit: "mm", format: "a5", orientation: "landscape", compress: true });
  const x = (A5_W - CARD_W_MM) / 2;
  const y = (A5_H - CARD_H_MM) / 2;
  add(doc, f, x, y);
  drawCutMarks(doc, x, y);
  doc.addPage("a5", "landscape");
  add(doc, b, x, y);
  drawCutMarks(doc, x, y);
  doc.save(fileName);
}

/** Ouvre une fenêtre d'impression aux dimensions CR-80 exactes (sans rognage). */
export async function printCard(front: HTMLElement, back: HTMLElement) {
  const f = await captureCard(front);
  const b = await captureCard(back);
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) return;
  win.document.write(`<!doctype html><html><head><title>Carte AS.CHRIS.K</title>
  <style>
    @page { size: ${CARD_W_MM}mm ${CARD_H_MM}mm; margin: 0; }
    html,body{margin:0;padding:0;background:#fff}
    img{display:block;width:${CARD_W_MM}mm;height:${CARD_H_MM}mm;page-break-after:always}
    img:last-child{page-break-after:auto}
  </style></head><body>
  <img src="${f.data}"/><img src="${b.data}"/>
  <script>
    var imgs=document.images,n=0;
    function go(){ if(++n>=imgs.length){ window.focus(); window.print(); } }
    for (var i=0;i<imgs.length;i++){ imgs[i].complete ? go() : imgs[i].addEventListener('load', go); }
  <\/script></body></html>`);
  win.document.close();
}
