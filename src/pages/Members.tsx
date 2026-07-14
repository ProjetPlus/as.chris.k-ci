import { Link } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMembers } from "@/db/useDb";
import { PageTitle, fmtDate, money } from "@/pages/pageUtils";
import { fullName } from "@/lib/memberWorkflow";

export default function Members() {
  const { members, deleteMember } = useMembers();
  return <div><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><PageTitle title="Membres" subtitle="Ayants droit et personne de tutel inclus dans chaque fiche" /><Button asChild><Link to="/register"><Plus className="h-4 w-4" /> Nouveau membre</Link></Button></div><div className="grid gap-3">{members.map((m) => <article key={m.id} className="rounded-lg border bg-card p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><Link to={`/members/${m.id}`} className="text-lg font-semibold text-primary">{fullName(m)}</Link><p className="font-mono text-sm">{m.member_id}</p><p className="text-sm text-muted-foreground">{m.campement} · {m.sous_prefecture} · {fmtDate(m.registration_date)}</p><p className="text-sm">Ayants droit {m.secondary_members.length} · Tutel {fullName(m.guardian)}</p></div><div className="flex items-center gap-2"><span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold">{m.status}</span><span className="text-sm font-semibold">{money(m.adhesion_amount || 0)}</span><Button variant="outline" size="icon" onClick={() => deleteMember(m.id)} title="Supprimer"><Trash2 className="h-4 w-4" /></Button></div></article>)}{members.length === 0 && <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">Aucun membre. Ajoutez le premier membre, même hors ligne.</div>}</div></div>;
}
