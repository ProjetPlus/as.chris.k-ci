import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMembers } from "@/db/useDb";
import { PageTitle } from "@/pages/pageUtils";

const DRAFT = "aschrisk.registration.draft.v2";
const readDraft = () => { try { return JSON.parse(sessionStorage.getItem(DRAFT) || "{}"); } catch { return {}; } };

export default function RegisterStep2() {
  const navigate = useNavigate();
  const { createMember } = useMembers();
  const [form, setForm] = useState(readDraft());
  const set = (path: string, value: string) => setForm((f: any) => { const n = { ...f }; const [a, b, c] = path.split("."); if (c) n[a] = { ...(n[a] || {}), [b]: { ...(n[a]?.[b] || {}), [c]: value } }; else if (b) n[a] = { ...(n[a] || {}), [b]: value }; else n[a] = value; sessionStorage.setItem(DRAFT, JSON.stringify(n)); return n; });
  const save = async () => {
    const secondary_members = [0, 1].map((i) => form.secondary?.[i]).filter((p: any) => p?.first_name || p?.last_name).map((p: any) => ({ ...p, relationship: p.relationship || "Ayant droit" }));
    await createMember({ ...form, secondary_members, guardian: form.guardian || {} });
    sessionStorage.removeItem(DRAFT);
    navigate("/members");
  };
  return <div><PageTitle title="Ayants droit et tutel" subtitle="Ces données sont synchronisées dans le même paquet que le membre" /><div className="grid gap-5"><section className="rounded-lg border bg-card p-5"><h2 className="font-semibold mb-4">Personne de tutel</h2><div className="grid gap-3 md:grid-cols-4"><div><Label>Nom</Label><Input value={form.guardian?.last_name || ""} onChange={(e) => set("guardian.last_name", e.target.value)} /></div><div><Label>Prénom</Label><Input value={form.guardian?.first_name || ""} onChange={(e) => set("guardian.first_name", e.target.value)} /></div><div><Label>Téléphone</Label><Input value={form.guardian?.phone || "+225 "} onChange={(e) => set("guardian.phone", e.target.value)} /></div><div><Label>Lien</Label><Input value={form.guardian?.relationship || ""} onChange={(e) => set("guardian.relationship", e.target.value)} /></div></div></section>{[0, 1].map((i) => <section key={i} className="rounded-lg border bg-card p-5"><h2 className="font-semibold mb-4">Ayant droit {i + 1}</h2><div className="grid gap-3 md:grid-cols-4"><div><Label>Nom</Label><Input value={form.secondary?.[i]?.last_name || ""} onChange={(e) => set(`secondary.${i}.last_name`, e.target.value)} /></div><div><Label>Prénom</Label><Input value={form.secondary?.[i]?.first_name || ""} onChange={(e) => set(`secondary.${i}.first_name`, e.target.value)} /></div><div><Label>Lien</Label><Input value={form.secondary?.[i]?.relationship || ""} onChange={(e) => set(`secondary.${i}.relationship`, e.target.value)} /></div><div><Label>Téléphone</Label><Input value={form.secondary?.[i]?.phone || ""} onChange={(e) => set(`secondary.${i}.phone`, e.target.value)} /></div></div></section>)}<div className="flex justify-between"><Button variant="outline" onClick={() => navigate("/register")}>Retour</Button><Button onClick={save}>Enregistrer</Button></div></div></div>;
}
