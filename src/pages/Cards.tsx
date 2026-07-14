import jsPDF from "jspdf";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Select, SelectItem } from "@/components/ui/select";
import { useMembers, useSettings } from "@/db/useDb";
import { PageTitle, fmtDate } from "@/pages/pageUtils";
import { fullName } from "@/lib/memberWorkflow";
import { useState } from "react";

const green = "#0F4B35";
const gold = "#C7A35A";
const ivory = "#F7F3E8";
const clean = (value: string) => value.replace(/\//g, " ");

export default function Cards() {
  const { members } = useMembers();
  const { settings } = useSettings();
  const [id, setId] = useState(members[0]?.id || "");
  const member = members.find((m) => m.id === id) || members[0];

  const generate = async () => {
    if (!member) return;
    // Format CR-80 standard: 85.6 x 53.98 mm
    const doc = new jsPDF({ unit: "mm", format: [85.6, 53.98], orientation: "landscape" });
    const qr = await QRCode.toDataURL(JSON.stringify({ member_id: member.member_id, name: fullName(member) }), { margin: 0, width: 256 });
    
    const assocName = clean(settings.association_name).toUpperCase();

    // FRONT SIDE (Page 1)
    doc.setFillColor(ivory); doc.rect(0, 0, 85.6, 53.98, "F");
    doc.setFillColor(green); doc.rect(0, 0, 85.6, 12, "F");
    doc.setFillColor(gold); doc.rect(0, 12, 85.6, 2, "F");
    doc.setTextColor("#FFFFFF"); doc.setFont("helvetica", "bold"); doc.setFontSize(8); 
    doc.text(assocName, 42.8, 7.5, { align: "center", maxWidth: 78 });
    
    // Photo Placeholder
    doc.setFillColor("#FFFFFF"); doc.roundedRect(7, 18, 21, 25, 2, 2, "F"); 
    doc.setTextColor(green); doc.setFontSize(7); doc.text("PHOTO", 17.5, 32, { align: "center" });
    
    // QR Code
    doc.addImage(qr, "PNG", 62, 18, 17, 17);
    
    // Member Info
    doc.setTextColor(green); doc.setFont("helvetica", "bold"); doc.setFontSize(13); 
    doc.text(clean(fullName(member).toUpperCase()), 32, 23, { maxWidth: 28 });
    doc.setTextColor(gold); doc.setFontSize(9); doc.text(clean(member.member_id), 32, 33);
    doc.setTextColor("#222222"); doc.setFont("helvetica", "normal"); doc.setFontSize(7); 
    doc.text([`Tél ${member.phone}`, `Campement ${member.campement}`, `Inscrit ${fmtDate(member.registration_date)}`].map(clean), 32, 39);
    
    // Footer
    doc.setFillColor(green); doc.rect(0, 48, 85.6, 5.98, "F"); 
    doc.setTextColor("#FFFFFF"); doc.setFontSize(6); doc.text("CARTE DE MEMBRE OFFICIELLE", 42.8, 52, { align: "center" });

    // BACK SIDE (Page 2)
    doc.addPage([85.6, 53.98], "landscape");
    doc.setFillColor(ivory); doc.rect(0, 0, 85.6, 53.98, "F");
    doc.setFillColor(green); doc.rect(0, 0, 85.6, 9, "F"); 
    doc.setTextColor("#FFFFFF"); doc.setFont("helvetica", "bold"); doc.setFontSize(8); 
    doc.text(assocName, 42.8, 6, { align: "center", maxWidth: 78 });
    
    doc.addImage(qr, "PNG", 31.8, 12, 22, 22);
    doc.setTextColor(green); doc.setFontSize(9); doc.text(clean(member.member_id), 42.8, 38, { align: "center" });
    doc.setTextColor("#222222"); doc.setFont("helvetica", "normal"); doc.setFontSize(6.5); 
    doc.text("Cette carte identifie un membre actif de l'association. Toute vérification se fait par QR code et registre officiel.", 42.8, 44, { align: "center", maxWidth: 70 });
    
    doc.setFillColor(gold); doc.rect(0, 50, 85.6, 3.98, "F");

    doc.save(`carte_${member.member_id.replace(/\//g, "_")}.pdf`);
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
  return (
    <div className="mx-auto aspect-[85.6/53.98] w-full max-w-[430px] overflow-hidden rounded-lg border shadow-elegant" style={{ background: ivory }}>
      <div className="h-full relative flex flex-col">
        <div className="h-[22%] flex items-center justify-center text-primary-foreground font-bold text-xs px-4 text-center leading-tight" style={{ background: green }}>
          {assocName}
        </div>
        <div className="h-1" style={{ background: gold }} />
        
        {back ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-10">
            <div className="h-20 w-20 border-4 border-primary grid place-items-center font-bold text-primary">QR</div>
            <p className="mt-2 font-mono font-bold" style={{ color: green }}>{member.member_id}</p>
            <p className="text-[10px] text-muted-foreground leading-tight mt-1">Vérification par QR code et registre officiel</p>
          </div>
        ) : (
          <div className="flex-1 p-4 grid grid-cols-[80px_1fr_60px] gap-3 items-center">
            <div className="h-20 rounded-md bg-card border border-dashed border-primary/20 grid place-items-center text-[10px] font-bold" style={{ color: green }}>PHOTO</div>
            <div>
              <p className="text-base font-bold leading-tight line-clamp-2" style={{ color: green }}>{fullName(member).toUpperCase()}</p>
              <p className="font-mono font-bold text-xs" style={{ color: gold }}>{member.member_id}</p>
              <div className="mt-1 space-y-0.5">
                <p className="text-[10px] truncate">{member.phone}</p>
                <p className="text-[10px] truncate">{member.campement}</p>
              </div>
            </div>
            <div className="h-14 w-14 border-2 border-primary grid place-items-center text-[10px] font-bold text-primary">QR</div>
          </div>
        )}
        
        <div className="absolute bottom-0 left-0 right-0 h-5 flex items-center justify-center text-[10px] text-primary-foreground font-semibold uppercase tracking-wider" style={{ background: green }}>
          {side}
        </div>
      </div>
    </div>
  );
}
