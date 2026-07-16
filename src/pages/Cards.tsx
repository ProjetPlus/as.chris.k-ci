import jsPDF from "jspdf";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Select, SelectItem } from "@/components/ui/select";
import { useMembers, useSettings } from "@/db/useDb";
import { PageTitle, fmtDate } from "@/pages/pageUtils";
import { fullName } from "@/lib/memberWorkflow";
import { useEffect, useState } from "react";

const bordeaux = "#C4654A";
const accent = "#B85A38";
const creme = "#FAF5EE";
const anthracite = "#1F1F1F";

const cardW = 85.6;
const cardH = 53.98;
const clean = (value?: string | number | null) => String(value ?? "").replace(/\//g, " ");
const memberPayload = (member: any) => JSON.stringify({ member_id: clean(member.member_id), name: clean(fullName(member)) });

export default function Cards() {
  const { members } = useMembers();
  const { settings } = useSettings();
  const [id, setId] = useState(members[0]?.id || "");
  const member = members.find((m) => m.id === id) || members[0];

  const generate = async () => {
    if (!member) return;
    const doc = new jsPDF({ unit: "mm", format: [cardW, cardH], orientation: "landscape" });
    const qr = await QRCode.toDataURL(memberPayload(member), { margin: 0, width: 256 });
    
    const assocName = clean(settings.association_name).toUpperCase();

    // Side A (Recto)
    doc.setFillColor(creme); doc.rect(0, 0, cardW, cardH, "F");
    doc.setFillColor(bordeaux); doc.rect(0, 0, cardW, 13.5, "F");
    doc.setFillColor(accent); doc.rect(0, 13.5, cardW, 1.5, "F");
    doc.setTextColor("#FFFFFF"); doc.setFont("helvetica", "bold"); doc.setFontSize(7.6); 
    doc.text(assocName, cardW / 2, 6.2, { align: "center", maxWidth: 76 });
    doc.setFontSize(5.5); doc.text("CARTE DE MEMBRE", cardW / 2, 10.2, { align: "center" });
    
    // Photo Placeholder
    doc.setDrawColor(accent); doc.setLineWidth(0.35); doc.setFillColor("#FFFFFF"); doc.roundedRect(6, 18, 22, 26, 1.5, 1.5, "FD"); 
    doc.setTextColor(bordeaux); doc.setFontSize(6.5); doc.text("PHOTO", 17, 32, { align: "center" });
    
    // Member Info (Centered now that QR is gone)
    doc.setTextColor(bordeaux); doc.setFont("helvetica", "bold"); doc.setFontSize(11.5); 
    doc.text(clean(fullName(member).toUpperCase()), 31, 22.4, { maxWidth: 50 });
    doc.setTextColor(accent); doc.setFontSize(7.8); doc.text(clean(member.member_id), 31, 30.8, { maxWidth: 50 });
    doc.setTextColor(anthracite); doc.setFont("helvetica", "normal"); doc.setFontSize(6.4); 
    doc.text([
      `Tél ${clean(member.phone)}`,
      `Campement ${clean(member.campement)}`,
      `Tutel ${clean(fullName(member.guardian))}`,
      `Couverts ${clean(member.total_covered_persons)} · Adhésion ${clean(member.adhesion_amount)} F`
    ], 31, 36, { maxWidth: 50, lineHeightFactor: 1.18 });
    
    // Footer Side A
    doc.setFillColor(bordeaux); doc.rect(0, 48, cardW, 5.98, "F"); 
    doc.setTextColor("#FFFFFF"); doc.setFont("helvetica", "bold"); doc.setFontSize(5.8); doc.text("CARTE OFFICIELLE AS.CHRIS.K", cardW / 2, 52, { align: "center" });

    // Side B (Verso)
    doc.addPage([cardW, cardH], "landscape");
    doc.setFillColor(creme); doc.rect(0, 0, cardW, cardH, "F");
    doc.setFillColor(bordeaux); doc.rect(0, 0, cardW, 11, "F"); 
    doc.setTextColor("#FFFFFF"); doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); 
    doc.text(assocName, cardW / 2, 6.8, { align: "center", maxWidth: 78 });
    
    doc.setTextColor(anthracite); doc.setFont("helvetica", "normal"); doc.setFontSize(6.2); 
    doc.text("Cette carte identifie un membre actif de l'association. Toute vérification se fait par QR code et registre officiel.", cardW / 2, 18, { align: "center", maxWidth: 70 });
    doc.setFillColor("#FFFFFF"); doc.roundedRect(33.8, 21.2, 18, 18, 1, 1, "F");
    doc.addImage(qr, "PNG", 34.5, 21.9, 16.6, 16.6);
    doc.setTextColor(bordeaux); doc.setFont("helvetica", "bold"); doc.setFontSize(7.2); doc.text(clean(member.member_id), cardW / 2, 42, { align: "center" });
    doc.setDrawColor(accent); doc.line(12, 47, 32, 47); doc.line(53.6, 47, 73.6, 47);
    doc.setTextColor(anthracite); doc.setFont("helvetica", "normal"); doc.setFontSize(4.7); doc.text("Président", 22, 50, { align: "center" }); doc.text("Secrétaire général", 63.6, 50, { align: "center" });
    
    doc.setFillColor(accent); doc.rect(0, 52, cardW, 1.98, "F");

    doc.save(`carte_${clean(member.member_id).replace(/\s+/g, "_")}.pdf`);
  };

  return (
    <div>
      <PageTitle title="Cartes Membres" subtitle="Génération de PDF duplex standard CR-80 (Charte AS.CHRIS.K)" />
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
            <Button onClick={generate} className="bg-bordeaux hover:bg-bordeaux-dark text-white">Télécharger PDF (Recto/Verso)</Button>
          </div>
          <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-2">
            <CardPreview side="Recto (Face A)" member={member} settings={settings} />
            <CardPreview side="Verso (Face B)" member={member} settings={settings} back />
          </div>
        </>
      ) : (
        <p className="rounded-lg border bg-card p-6 text-muted-foreground shadow-sm">Ajoutez un membre pour générer une carte.</p>
      )}
    </div>
  );
}

function CardPreview({ member, side, back, settings }: { member: any; side: string; back?: boolean; settings: any }) {
  const assocName = (settings.association_name || "ASSOCIATION").toUpperCase();
  const [qr, setQr] = useState("");

  useEffect(() => {
    let mounted = true;
    QRCode.toDataURL(memberPayload(member), { margin: 0, width: 160 }).then((src) => mounted && setQr(src));
    return () => { mounted = false; };
  }, [member]);

  return (
    <div className="mx-auto aspect-[85.6/53.98] w-full max-w-[430px] overflow-hidden rounded-xl border shadow-elegant" style={{ background: creme }}>
      <div className="relative h-full overflow-hidden">
        <div className="flex h-[25%] flex-col items-center justify-center px-6 text-center font-bold leading-tight text-white" style={{ background: bordeaux }}>
          <span className="text-[11px] uppercase tracking-wide">{clean(assocName)}</span>
          {!back && <span className="mt-1 text-[8px] uppercase opacity-90">Carte de membre</span>}
        </div>
        {!back && <div className="h-1" style={{ background: accent }} />}
        
        {back ? (
          <div className="flex h-[75%] flex-col items-center justify-center px-10 pb-4 text-center">
            <p className="max-w-[350px] text-[11px] leading-tight" style={{ color: anthracite }}>Cette carte identifie un membre actif de l'association. Toute vérification se fait par QR code et registre officiel.</p>
            <div className="mt-3 grid h-20 w-20 place-items-center rounded-sm bg-white p-1 shadow-sm border">
              {qr ? <img src={qr} alt="QR code membre" className="h-full w-full" /> : <span className="text-[10px] font-bold text-primary">QR</span>}
            </div>
            <p className="mt-2 font-mono text-xs font-bold" style={{ color: bordeaux }}>{clean(member.member_id)}</p>
            <div className="mt-3 flex w-full items-end justify-between px-4 text-[9px]" style={{ color: anthracite }}>
              <span className="border-t pt-1" style={{ borderColor: accent }}>Président</span>
              <span className="border-t pt-1" style={{ borderColor: accent }}>Secrétaire général</span>
            </div>
          </div>
        ) : (
          <div className="grid h-[75%] grid-cols-[100px_1fr] items-center gap-4 px-6 pb-6 pt-3">
            <div className="grid h-28 place-items-center rounded-md border-2 bg-white text-[10px] font-bold shadow-inner" style={{ borderColor: accent, color: bordeaux }}>PHOTO</div>
            <div className="min-w-0">
              <p className="line-clamp-2 text-base font-bold leading-tight" style={{ color: bordeaux }}>{clean(fullName(member).toUpperCase())}</p>
              <p className="mt-1 truncate font-mono text-sm font-bold" style={{ color: accent }}>{clean(member.member_id)}</p>
              <div className="mt-2 space-y-0.5 text-[10px] leading-tight" style={{ color: anthracite }}>
                <p className="truncate">Tél {clean(member.phone)}</p>
                <p className="truncate">Campement {clean(member.campement)}</p>
                <p className="truncate">Tutel {clean(fullName(member.guardian))}</p>
                <p className="truncate">Couverts {clean(member.total_covered_persons)} · Adhésion {clean(member.adhesion_amount)} F</p>
              </div>
            </div>
          </div>
        )}
        
        <div className="absolute bottom-0 left-0 right-0 flex h-6 items-center justify-center text-[10px] font-bold uppercase tracking-widest text-white" style={{ background: back ? accent : bordeaux }}>
          {clean(side)}
        </div>
      </div>
    </div>
  );
}
