import { toPng } from "html-to-image";
import jsPDF from "jspdf";
import { CARD_H_MM, CARD_H_PX, CARD_W_MM, CARD_W_PX } from "@/components/MemberCard";

// A5 landscape
const A5_W = 210;
const A5_H = 148;

/**
 * html-to-image clones the node into an inline SVG foreignObject, so modern CSS
 * (flex, gradients, letter-spacing, web fonts) renders EXACTLY like the preview.
 * html2canvas re-implements layout and was collapsing our rows on export.
 */
export async function captureCardPng(node: HTMLElement): Promise<string> {
  const opts = {
    pixelRatio: 3,
    width: CARD_W_PX,
    height: CARD_H_PX,
    cacheBust: true,
    skipFonts: false,
    style: { transform: "none", transformOrigin: "top left", margin: "0", boxShadow: "none" },
  };
  // First pass sometimes lands before images/fonts settle; a second pass is stable.
  await toPng(node, opts);
  return toPng(node, opts);
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
  const [f, b] = [await captureCardPng(front), await captureCardPng(back)];
  if (format === "cr80") {
    const doc = new jsPDF({ unit: "mm", format: [CARD_W_MM, CARD_H_MM], orientation: "landscape" });
    doc.addImage(f, "PNG", 0, 0, CARD_W_MM, CARD_H_MM);
    doc.addPage([CARD_W_MM, CARD_H_MM], "landscape");
    doc.addImage(b, "PNG", 0, 0, CARD_W_MM, CARD_H_MM);
    doc.save(fileName);
    return;
  }
  const doc = new jsPDF({ unit: "mm", format: "a5", orientation: "landscape" });
  const x = (A5_W - CARD_W_MM) / 2;
  const y = (A5_H - CARD_H_MM) / 2;
  doc.addImage(f, "PNG", x, y, CARD_W_MM, CARD_H_MM);
  drawCutMarks(doc, x, y);
  doc.addPage("a5", "landscape");
  doc.addImage(b, "PNG", x, y, CARD_W_MM, CARD_H_MM);
  drawCutMarks(doc, x, y);
  doc.save(fileName);
}

/** Opens a print window with both faces at exact CR-80 size (no cropping). */
export async function printCard(front: HTMLElement, back: HTMLElement) {
  const [f, b] = [await captureCardPng(front), await captureCardPng(back)];
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) return;
  win.document.write(`<!doctype html><html><head><title>Carte AS.CHRIS.K</title>
  <style>
    @page { size: ${CARD_W_MM}mm ${CARD_H_MM}mm; margin: 0; }
    html,body{margin:0;padding:0;background:#fff}
    img{display:block;width:${CARD_W_MM}mm;height:${CARD_H_MM}mm;page-break-after:always}
    img:last-child{page-break-after:auto}
  </style></head><body>
  <img src="${f}"/><img src="${b}"/>
  <script>
    var imgs=document.images,n=0;
    function go(){ if(++n>=imgs.length){ window.focus(); window.print(); } }
    for (var i=0;i<imgs.length;i++){ imgs[i].complete ? go() : imgs[i].addEventListener('load', go); }
  <\/script></body></html>`);
  win.document.close();
}
