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
const clean = (value: string) => value.split("/").join(" ");

export default function Cards() {
  const { members } = useMembers();
  const { settings } = useSettings();
  const [id, setId] = useState(members[0]?.id || "");
  const member = members.find((m) => m.id === id) || members[0];
  const generate = async () => {
    if (!member) return;
    const doc = new jsPDF({ unit: "mm", format: [85.6, 107.96], orientation: "portrait" });
    const qr = await QRCode.toDataURL(JSON.stringify({ member_id: member.member_id, name: fullName(member) }), { margin: 0, width: 256 });
    const drawFront = () => {
      doc.setFillColor(ivory); doc.rect(0, 0, 85.6, 53.98, "F");
      doc.setFillColor(green); doc.rect(0, 0, 85.6, 12, "F");
      doc.setFillColor(gold); doc.rect(0, 12, 85.6, 2, "F");
      doc.setTextColor("#FFFFFF"); doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.text(clean(settings.association_name), 42.8, 7.5, { align: "center", maxWidth: 78 });
      doc.setFillColor("#FFFFFF"); doc.roundedRect(7, 18, 21, 25, 2, 2, "F"); doc.setTextColor(green); doc.setFontSize(7); doc.text("PHOTO", 17.5, 32, { align: "center" });
      doc.addImage(qr, "PNG", 62, 18, 17, 17);
      doc.setTextColor(green); doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.text(clean(fullName(member).toUpperCase()), 32, 23, { maxWidth: 28 });
      doc.setTextColor(gold); doc.setFontSize(9); doc.text(clean(member.member_id), 32, 33);
      doc.setTextColor("#222222"); doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.text([`Tél ${member.phone}`, `Campement ${member.campement}`, `Inscrit ${fmtDate(member.registration_date)}`].map(clean), 32, 39);
      doc.setFillColor(green); doc.rect(0, 48, 85.6, 5.98, "F"); doc.setTextColor("#FFFFFF"); doc.setFontSize(6); doc.text("CARTE DE MEMBRE", 42.8, 52, { align: "center" });
    };
    const drawBack = () => {
      doc.setFillColor(ivory); doc.rect(0, 53.98, 85.6, 53.98, "F");
      doc.setFillColor(green); doc.rect(0, 53.98, 85.6, 9, "F"); doc.setTextColor("#FFFFFF"); doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.text("AS.CHRIS.K", 42.8, 60, { align: "center" });
      doc.addImage(qr, "PNG", 31.8, 66, 22, 22);
      doc.setTextColor(green); doc.setFontSize(9); doc.text(clean(member.member_id), 42.8, 92, { align: "center" });
      doc.setTextColor("#222222"); doc.setFont("helvetica", "normal"); doc.setFontSize(6.5); doc.text("Cette carte identifie un membre actif de l'association. Toute vérification se fait par QR code et registre officiel.", 42.8, 98, { align: "center", maxWidth: 70 });
      doc.setFillColor(gold); doc.rect(0, 104, 85.6, 3.96, "F");
    };
    drawFront(); drawBack(); doc.save(`carte_${member.member_id.split("/").join("_")}.pdf`);
  };
  return <div><PageTitle title="Cartes ANZRBO" subtitle="Aperçu duplex centré recto et verso" />{member ? <><div className="mb-4 flex gap-3"><Select value={member.id} onValueChange={setId}>{members.map((m) => <SelectItem key={m.id} value={m.id}>{fullName(m)} · {m.member_id}</SelectItem>)}</Select><Button onClick={generate}>PDF duplex</Button></div><div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-2"><CardPreview side="Recto" member={member} /><CardPreview side="Verso" member={member} back /></div></> : <p className="rounded-lg border bg-card p-6 text-muted-foreground">Ajoutez un membre pour générer une carte.</p>}</div>;
}

function CardPreview({ member, side, back }: { member: any; side: string; back?: boolean }) {
  return <div className="mx-auto aspect-[85.6/53.98] w-full max-w-[430px] overflow-hidden rounded-lg border shadow-elegant" style={{ background: ivory }}><div className="h-full relative"><div className="h-[22%] flex items-center justify-center text-primary-foreground font-bold text-sm" style={{ background: green }}>{back ? "AS.CHRIS.K" : "ASSOCIATION OFFICIELLE"}</div><div className="h-1" style={{ background: gold }} />{back ? <div className="h-[70%] flex flex-col items-center justify-center text-center px-10"><div className="h-24 w-24 border-4 border-primary grid place-items-center font-bold text-primary">QR</div><p className="mt-3 font-mono font-bold" style={{ color: green }}>{member.member_id}</p><p className="text-xs text-muted-foreground">Vérification par registre officiel</p></div> : <div className="p-5 grid grid-cols-[90px_1fr_70px] gap-4 items-center"><div className="h-24 rounded-md bg-card grid place-items-center text-xs font-bold" style={{ color: green }}>PHOTO</div><div><p className="text-xl font-bold leading-tight" style={{ color: green }}>{fullName(member).toUpperCase()}</p><p className="font-mono font-bold" style={{ color: gold }}>{member.member_id}</p><p className="mt-2 text-xs">{member.phone}</p><p className="text-xs">{member.campement}</p></div><div className="h-16 w-16 border-4 border-primary grid place-items-center text-xs font-bold text-primary">QR</div></div>}<div className="absolute bottom-0 left-0 right-0 h-6 flex items-center justify-center text-xs text-primary-foreground" style={{ background: green }}>{side}</div></div></div>;
}
