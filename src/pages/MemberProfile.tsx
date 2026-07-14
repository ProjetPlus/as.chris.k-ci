import { useParams } from "react-router-dom";
import { useMembers } from "@/db/useDb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageTitle, fmtDate, money } from "@/pages/pageUtils";
import { fullName } from "@/lib/memberWorkflow";

export default function MemberProfile() {
  const { id = "" } = useParams();
  const { getMember, updateMember } = useMembers();
  const member = getMember(id);
  if (!member) return <PageTitle title="Membre introuvable" />;
  const patch = (key: string, value: any) => updateMember(member.id, { [key]: value });
  return <div><PageTitle title={fullName(member)} subtitle={`${member.member_id} · Inscrit le ${fmtDate(member.registration_date)}`} /><div className="grid gap-5 lg:grid-cols-2"><section className="rounded-lg border bg-card p-5 space-y-3"><h2 className="font-semibold">Fiche principale</h2><div><Label>Téléphone</Label><Input defaultValue={member.phone} onBlur={(e) => patch("phone", e.target.value)} /></div><div><Label>Campement</Label><Input defaultValue={member.campement} onBlur={(e) => patch("campement", e.target.value)} /></div><div><Label>Sous préfecture</Label><Input defaultValue={member.sous_prefecture} onBlur={(e) => patch("sous_prefecture", e.target.value)} /></div><p className="font-semibold">Adhésion {money(member.adhesion_amount || 0)}</p></section><section className="rounded-lg border bg-card p-5 space-y-3"><h2 className="font-semibold">Personne de tutel</h2><div><Label>Nom</Label><Input defaultValue={member.guardian?.last_name || ""} onBlur={(e) => patch("guardian", { ...member.guardian, last_name: e.target.value })} /></div><div><Label>Prénom</Label><Input defaultValue={member.guardian?.first_name || ""} onBlur={(e) => patch("guardian", { ...member.guardian, first_name: e.target.value })} /></div><div><Label>Téléphone</Label><Input defaultValue={member.guardian?.phone || ""} onBlur={(e) => patch("guardian", { ...member.guardian, phone: e.target.value })} /></div></section><section className="rounded-lg border bg-card p-5 lg:col-span-2"><h2 className="font-semibold mb-3">Ayants droit</h2><div className="grid gap-3 md:grid-cols-2">{member.secondary_members.map((p, idx) => <div key={p.id} className="rounded-md border p-3"><p className="font-semibold">{fullName(p)}</p><p className="text-sm text-muted-foreground">{p.relationship}</p><Button className="mt-2" variant="outline" size="sm" onClick={() => patch("secondary_members", member.secondary_members.filter((_, i) => i !== idx))}>Retirer</Button></div>)}{member.secondary_members.length === 0 && <p className="text-muted-foreground">Aucun ayant droit.</p>}</div></section></div></div>;
}
