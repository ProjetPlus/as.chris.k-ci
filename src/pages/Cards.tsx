import { useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Button } from "@/components/ui/button";
import { Select, SelectItem } from "@/components/ui/select";
import { useMembers, useSettings } from "@/db/useDb";
import { PageTitle } from "@/pages/pageUtils";
import { fullName } from "@/lib/memberWorkflow";
import { MemberCard, CARD_W_MM, CARD_H_MM, CARD_W_PX, CARD_H_PX } from "@/components/MemberCard";

export default function Cards() {
  const { members } = useMembers();
  const { settings } = useSettings();
  const [id, setId] = useState(members[0]?.id || "");
  const member = members.find((m) => m.id === id) || members[0];

  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  const generate = async () => {
    if (!member || !frontRef.current || !backRef.current) return;
    setBusy(true);
    try {
      const opts = { scale: 3, backgroundColor: null, useCORS: true, logging: false, width: CARD_W_PX, height: CARD_H_PX } as const;
      const [frontCanvas, backCanvas] = await Promise.all([
        html2canvas(frontRef.current, opts),
        html2canvas(backRef.current, opts),
      ]);
      const doc = new jsPDF({ unit: "mm", format: [CARD_W_MM, CARD_H_MM], orientation: "landscape" });
      doc.addImage(frontCanvas.toDataURL("image/png"), "PNG", 0, 0, CARD_W_MM, CARD_H_MM);
      doc.addPage([CARD_W_MM, CARD_H_MM], "landscape");
      doc.addImage(backCanvas.toDataURL("image/png"), "PNG", 0, 0, CARD_W_MM, CARD_H_MM);
      doc.save(`carte_${String(member.member_id).replace(/\s+/g, "_")}.pdf`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageTitle title="Cartes Membres" subtitle="Aperçu et export duplex CR-80 · Charte AS.CHRIS.K" />
      {member ? (
        <>
          <div className="mb-6 flex flex-wrap gap-4">
            <div className="w-full max-w-sm">
              <Select value={member.id} onValueChange={setId}>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{fullName(m)} · {m.member_id}</SelectItem>
                ))}
              </Select>
            </div>
            <Button onClick={generate} disabled={busy} className="bg-bordeaux hover:bg-bordeaux-dark text-primary-foreground">
              {busy ? "Génération…" : "Télécharger PDF (Recto/Verso)"}
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
  // Scale the fixed-pixel card down responsively for preview while keeping DOM
  // dimensions intact for html2canvas.
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
