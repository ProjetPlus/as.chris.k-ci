import jsPDF from "jspdf";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Select, SelectItem } from "@/components/ui/select";
import { useMembers, useSettings } from "@/db/useDb";
import { PageTitle, fmtDate } from "@/pages/pageUtils";
import { fullName } from "@/lib/memberWorkflow";
import { useEffect, useState } from "react";

const green = "#0F4B35";
const gold = "#C7A35A";
const ivory = "#F7F3E8";
const ink = "#1E241F";
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

    doc.setFillColor(ivory); doc.rect(0, 0, cardW, cardH, "F");
    doc.setFillColor(green); doc.rect(0, 0, cardW, 13.5, "F");
    doc.setFillColor(gold); doc.rect(0, 13.5, cardW, 1.5, "F");
    doc.setTextColor("#FFFFFF"); doc.setFont("helvetica", "bold"); doc.setFontSize(7.6); 
    doc.text(assocName, cardW / 2, 6.2, { align: "center", maxWidth: 76 });
    doc.setFontSize(5.5); doc.text("CARTE DE MEMBRE", cardW / 2, 10.2, { align: "center" });
    
    doc.setDrawColor(gold); doc.setLineWidth(0.35); doc.setFillColor("#FFFFFF"); doc.roundedRect(6, 18, 22, 26, 1.5, 1.5, "FD"); 
    doc.setTextColor(green); doc.setFontSize(6.5); doc.text("PHOTO", 17, 32, { align: "center" });
    
    doc.setFillColor("#FFFFFF"); doc.roundedRect(62.5, 18, 17.5, 17.5, 1, 1, "F");
    doc.addImage(qr, "PNG", 63.25, 18.75, 16, 16);
    
    doc.setTextColor(green); doc.setFont("helvetica", "bold"); doc.setFontSize(11.5); 
    doc.text(clean(fullName(member).toUpperCase()), 31, 22.4, { maxWidth: 30 });
    doc.setTextColor(gold); doc.setFontSize(7.8); doc.text(clean(member.member_id), 31, 30.8, { maxWidth: 30 });
    doc.setTextColor(ink); doc.setFont("helvetica", "normal"); doc.setFontSize(6.4); 
    doc.text([`Tél ${clean(member.phone)}`, `Campement ${clean(member.campement)}`, `Tutel ${clean(fullName(member.guardian))}`, `Couverts ${clean(member.total_covered_persons)} · Adhésion ${clean(member.adhesion_amount)} F`], 31, 36, { maxWidth: 30.5, lineHeightFactor: 1.18 });
    
    doc.setFillColor(green); doc.rect(0, 48, cardW, 5.98, "F"); 
    doc.setTextColor("#FFFFFF"); doc.setFont("helvetica", "bold"); doc.setFontSize(5.8); doc.text("CARTE OFFICIELLE ANZRBO", cardW / 2, 52, { align: "center" });

    doc.addPage([cardW, cardH], "landscape");
    doc.setFillColor(ivory); doc.rect(0, 0, cardW, cardH, "F");
    doc.setFillColor(green); doc.rect(0, 0, cardW, 11, "F"); 
    doc.setTextColor("#FFFFFF"); doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); 
    doc.text(assocName, cardW / 2, 6.8, { align: "center", maxWidth: 78 });
    
    doc.setTextColor(ink); doc.setFont("helvetica", "normal"); doc.setFontSize(6.2); 
    doc.text("Cette carte identifie un membre actif de l'association. Toute vérification se fait par QR code et registre officiel.", cardW / 2, 18, { align: "center", maxWidth: 70 });
    doc.setFillColor("#FFFFFF"); doc.roundedRect(33.8, 21.2, 18, 18, 1, 1, "F");
    doc.addImage(qr, "PNG", 34.5, 21.9, 16.6, 16.6);
    doc.setTextColor(green); doc.setFont("helvetica", "bold"); doc.setFontSize(7.2); doc.text(clean(member.member_id), cardW / 2, 42, { align: "center" });
    doc.setDrawColor(gold); doc.line(12, 47, 32, 47); doc.line(53.6, 47, 73.6, 47);
    doc.setTextColor(ink); doc.setFont("helvetica", "normal"); doc.setFontSize(4.7); doc.text("Président", 22, 50, { align: "center" }); doc.text("Secrétaire général", 63.6, 50, { align: "center" });
    
    doc.setFillColor(gold); doc.rect(0, 52, cardW, 1.98, "F");

    doc.save(`carte_${clean(member.member_id).replace(/\s+/g, "_")}.pdf`);
  };

  return (
    <div>
      <PageTitle title="Cartes ANZRBO" subtitle="Génération de PDF duplex standard CR-80" />
      {member ? (
        <>
          <div className="mb-4 flex gap-3">
            <Select value={member.id} onValueChange={setId}>
              {members.map((m) => (
                <SelectItem key={m.id} value={m.id}>{fullName(m)} · {m.member_id}</SelectItem>
              ))}
            </Select>
            <Button onClick={generate}>Télécharger PDF (2 pages)</Button>
          </div>
          <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-2">
            <CardPreview side="Recto" member={member} settings={settings} />
            <CardPreview side="Verso" member={member} settings={settings} back />
          </div>
        </>
      ) : (
        <p className="rounded-lg border bg-card p-6 text-muted-foreground">Ajoutez un membre pour générer une carte.</p>
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
    <div className="mx-auto aspect-[85.6/53.98] w-full max-w-[430px] overflow-hidden rounded-lg border shadow-elegant" style={{ background: ivory }}>
      <div className="relative h-full overflow-hidden">
        <div className="flex h-[25%] flex-col items-center justify-center px-6 text-center font-bold leading-tight text-primary-foreground" style={{ background: green }}>
          <span className="text-[11px]">{clean(assocName)}</span>
          {!back && <span className="mt-1 text-[8px] uppercase">Carte de membre</span>}
        </div>
        {!back && <div className="h-1" style={{ background: gold }} />}
        
        {back ? (
          <div className="flex h-[75%] flex-col items-center justify-center px-10 pb-4 text-center">
            <p className="max-w-[350px] text-[11px] leading-tight" style={{ color: ink }}>Cette carte identifie un membre actif de l'association. Toute vérification se fait par QR code et registre officiel.</p>
            <div className="mt-3 grid h-20 w-20 place-items-center rounded-sm bg-card p-1">
              {qr ? <img src={qr} alt="QR code membre" className="h-full w-full" /> : <span className="text-[10px] font-bold text-primary">QR</span>}
            </div>
            <p className="mt-2 font-mono text-xs font-bold" style={{ color: green }}>{clean(member.member_id)}</p>
            <div className="mt-3 flex w-full items-end justify-between px-4 text-[9px]" style={{ color: ink }}>
              <span className="border-t pt-1" style={{ borderColor: gold }}>Président</span>
              <span className="border-t pt-1" style={{ borderColor: gold }}>Secrétaire général</span>
            </div>
          </div>
        ) : (
          <div className="grid h-[75%] grid-cols-[88px_1fr_72px] items-center gap-3 px-6 pb-6 pt-3">
            <div className="grid h-28 place-items-center rounded-md border bg-card text-[10px] font-bold" style={{ borderColor: gold, color: green }}>PHOTO</div>
            <div className="min-w-0">
              <p className="line-clamp-2 text-base font-bold leading-tight" style={{ color: green }}>{clean(fullName(member).toUpperCase())}</p>
              <p className="mt-1 truncate font-mono text-xs font-bold" style={{ color: gold }}>{clean(member.member_id)}</p>
              <div className="mt-2 space-y-0.5 text-[10px] leading-tight" style={{ color: ink }}>
                <p className="truncate">Tél {clean(member.phone)}</p>
                <p className="truncate">Campement {clean(member.campement)}</p>
                <p className="truncate">Tutel {clean(fullName(member.guardian))}</p>
                <p className="truncate">Couverts {clean(member.total_covered_persons)} · Adhésion {clean(member.adhesion_amount)} F</p>
              </div>
            </div>
            <div className="grid h-[72px] w-[72px] place-items-center rounded-sm bg-card p-1">
              {qr ? <img src={qr} alt="QR code membre" className="h-full w-full" /> : <span className="text-[10px] font-bold text-primary">QR</span>}
            </div>
          </div>
        )}
        
        <div className="absolute bottom-0 left-0 right-0 flex h-5 items-center justify-center text-[10px] font-semibold uppercase tracking-normal text-primary-foreground" style={{ background: back ? gold : green }}>
          {clean(side)}
        </div>
      </div>
    </div>
  );
}
