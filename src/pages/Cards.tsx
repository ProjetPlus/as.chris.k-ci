import { useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Button } from "@/components/ui/button";
import { Select, SelectItem } from "@/components/ui/select";
import { useMembers, useSettings } from "@/db/useDb";
import { PageTitle } from "@/pages/pageUtils";
import { fullName } from "@/lib/memberWorkflow";
import { MemberCard, CARD_W_MM, CARD_H_MM, CARD_W_PX, CARD_H_PX } from "@/components/MemberCard";

// A5 landscape: 210 x 148 mm. Duplex layout centers the card on the page for
// clean printing without cropping. Recto on page 1, verso on page 2 (identical
// position -> back-to-back when duplex-printed).
const A5_W = 210;
const A5_H = 148;

export default function Cards() {
  const { members } = useMembers();
  const { settings } = useSettings();
  const [id, setId] = useState(members[0]?.id || "");
  const member = members.find((m) => m.id === id) || members[0];

  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<null | "cr80" | "a5">(null);

  async function captureBoth() {
    const opts = { scale: 3, backgroundColor: null, useCORS: true, logging: false, width: CARD_W_PX, height: CARD_H_PX } as const;
    return Promise.all([
      html2canvas(frontRef.current!, opts),
      html2canvas(backRef.current!, opts),
    ]);
  }

  const exportCr80 = async () => {
    if (!member || !frontRef.current || !backRef.current) return;
    setBusy("cr80");
    try {
      const [front, back] = await captureBoth();
      const doc = new jsPDF({ unit: "mm", format: [CARD_W_MM, CARD_H_MM], orientation: "landscape" });
      doc.addImage(front.toDataURL("image/png"), "PNG", 0, 0, CARD_W_MM, CARD_H_MM);
      doc.addPage([CARD_W_MM, CARD_H_MM], "landscape");
      doc.addImage(back.toDataURL("image/png"), "PNG", 0, 0, CARD_W_MM, CARD_H_MM);
      doc.save(`carte_${String(member.member_id).replace(/\s+/g, "_")}.pdf`);
    } finally {
      setBusy(null);
    }
  };

  const exportA5Duplex = async () => {
    if (!member || !frontRef.current || !backRef.current) return;
    setBusy("a5");
    try {
      const [front, back] = await captureBoth();
      const doc = new jsPDF({ unit: "mm", format: "a5", orientation: "landscape" });
      const x = (A5_W - CARD_W_MM) / 2;
      const y = (A5_H - CARD_H_MM) / 2;
      // Cut marks for cleaner trimming.
      const drawMarks = () => {
        doc.setDrawColor(160);
        doc.setLineWidth(0.1);
        const m = 3;
        [[x, y], [x + CARD_W_MM, y], [x, y + CARD_H_MM], [x + CARD_W_MM, y + CARD_H_MM]].forEach(([px, py]) => {
          doc.line(px - m, py, px - 1, py);
          doc.line(px + 1, py, px + m, py);
          doc.line(px, py - m, px, py - 1);
          doc.line(px, py + 1, px, py + m);
        });
      };
      doc.addImage(front.toDataURL("image/png"), "PNG", x, y, CARD_W_MM, CARD_H_MM);
      drawMarks();
      doc.addPage("a5", "landscape");
      doc.addImage(back.toDataURL("image/png"), "PNG", x, y, CARD_W_MM, CARD_H_MM);
      drawMarks();
      doc.save(`carte_A5_duplex_${String(member.member_id).replace(/\s+/g, "_")}.pdf`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <PageTitle title="Cartes Membres" subtitle="Aperçu et export duplex CR-80 · Charte AS.CHRIS.K" />
      {member ? (
        <>
          <div className="mb-6 flex flex-wrap gap-3">
            <div className="w-full max-w-sm">
              <Select value={member.id} onValueChange={setId}>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{fullName(m)} · {m.member_id}</SelectItem>
                ))}
              </Select>
            </div>
            <Button onClick={exportCr80} disabled={busy !== null} className="bg-bordeaux hover:bg-bordeaux-dark text-primary-foreground">
              {busy === "cr80" ? "Génération…" : "PDF CR-80 (Recto/Verso)"}
            </Button>
            <Button onClick={exportA5Duplex} disabled={busy !== null} variant="outline">
              {busy === "a5" ? "Génération…" : "PDF A5 duplex (centré)"}
            </Button>
          </div>

          <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-2">
            <CardStage label="Recto (Face A)">
              <MemberCard ref={frontRef} member={member} settings={settings} side="front" />
            </CardStage>
            <CardStage label="Verso (Face B)">
              <MemberCard ref={backRef} member={member} settings={settings} side="back" />
            </CardStage>
          </div>
        </>
      ) : (
        <p className="rounded-lg border bg-card p-6 text-muted-foreground shadow-sm">Ajoutez un membre pour générer une carte.</p>
      )}
    </div>
  );
}

function CardStage({ label, children }: { label: string; children: React.ReactNode }) {
  const scale = 0.62;
  return (
    <div className="space-y-3">
      <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</div>
      <div style={{ width: CARD_W_PX * scale, height: CARD_H_PX * scale, position: "relative" }} className="mx-auto">
        <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: CARD_W_PX, height: CARD_H_PX }}>
          {children}
        </div>
      </div>
    </div>
  );
}

