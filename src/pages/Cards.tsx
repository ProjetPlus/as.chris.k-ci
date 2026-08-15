import { useLayoutEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectItem } from "@/components/ui/select";
import { useMembers, useSettings } from "@/db/useDb";
import { PageTitle } from "@/pages/pageUtils";
import { fullName } from "@/lib/memberWorkflow";
import { MemberCard, CARD_W_PX, CARD_H_PX } from "@/components/MemberCard";
import { exportCardPdf, printCard } from "@/lib/cardExport";

export default function Cards() {
  const { members } = useMembers();
  const { settings } = useSettings();
  const [id, setId] = useState(members[0]?.id || "");
  const member = members.find((m) => m.id === id) || members[0];

  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<null | "cr80" | "a5" | "print">(null);

  const run = async (kind: "cr80" | "a5" | "print") => {
    if (!member || !frontRef.current || !backRef.current) return;
    setBusy(kind);
    try {
      const file = `carte_${kind === "a5" ? "A5_duplex_" : ""}${String(member.member_id).replace(/\s+/g, "_")}.pdf`;
      if (kind === "print") await printCard(frontRef.current, backRef.current);
      else await exportCardPdf(frontRef.current, backRef.current, file, kind);
    } catch (e: any) {
      toast.error(e?.message || "Opération impossible");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <PageTitle title="Cartes Membres" subtitle="Aperçu et export duplex CR-80 · Rendu identique à l'aperçu" />
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
            <Button onClick={() => run("cr80")} disabled={busy !== null} className="bg-bordeaux hover:bg-bordeaux-dark text-primary-foreground">
              {busy === "cr80" ? "Génération…" : "PDF CR-80 (Recto/Verso)"}
            </Button>
            <Button onClick={() => run("a5")} disabled={busy !== null} variant="outline">
              {busy === "a5" ? "Génération…" : "PDF A5 duplex (centré)"}
            </Button>
            <Button onClick={() => run("print")} disabled={busy !== null} variant="outline">
              <Printer className="mr-2 h-4 w-4" />{busy === "print" ? "Préparation…" : "Imprimer"}
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
  const boxRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const apply = () => setScale(Math.min(1, el.clientWidth / CARD_W_PX));
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="space-y-3">
      <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</div>
      <div ref={boxRef} className="w-full" style={{ height: CARD_H_PX * scale, position: "relative" }}>
        <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: CARD_W_PX, height: CARD_H_PX }}>
          {children}
        </div>
      </div>
    </div>
  );
}
