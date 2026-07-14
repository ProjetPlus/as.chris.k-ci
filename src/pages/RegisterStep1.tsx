import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectItem } from "@/components/ui/select";
import { PageTitle } from "@/pages/pageUtils";

const DRAFT = "aschrisk.registration.draft.v2";
const readDraft = () => { try { return JSON.parse(sessionStorage.getItem(DRAFT) || "{}"); } catch { return {}; } };

export default function RegisterStep1() {
  const navigate = useNavigate();
  const [form, setForm] = useState(readDraft());
  const set = (k: string, v: string | boolean) => setForm((f: any) => { const n = { ...f, [k]: v }; sessionStorage.setItem(DRAFT, JSON.stringify(n)); return n; });
  return <div><PageTitle title="Inscription membre" subtitle="Étape principale avec contacts et adhésion" /><div className="rounded-lg border bg-card p-5 grid gap-4 md:grid-cols-2"><div><Label>Nom</Label><Input value={form.last_name || ""} onChange={(e) => set("last_name", e.target.value)} /></div><div><Label>Prénom</Label><Input value={form.first_name || ""} onChange={(e) => set("first_name", e.target.value)} /></div><div><Label>Téléphone</Label><Input value={form.phone || "+225 "} onChange={(e) => set("phone", e.target.value)} /></div><div><Label>WhatsApp</Label><Input value={form.whatsapp || "+225 "} onChange={(e) => set("whatsapp", e.target.value)} /></div><div><Label>Campement</Label><Input value={form.campement || ""} onChange={(e) => set("campement", e.target.value)} /></div><div><Label>Sous préfecture</Label><Input value={form.sous_prefecture || ""} onChange={(e) => set("sous_prefecture", e.target.value)} /></div><div><Label>Type de pièce</Label><Select value={form.id_type || "CNI"} onValueChange={(v) => set("id_type", v)}><SelectItem value="CNI">CNI</SelectItem><SelectItem value="Attestation">Attestation</SelectItem><SelectItem value="Passeport">Passeport</SelectItem></Select></div><div><Label>Numéro de pièce</Label><Input value={form.id_number || ""} onChange={(e) => set("id_number", e.target.value)} /></div><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(form.adhesion_paid)} onChange={(e) => set("adhesion_paid", e.target.checked)} /> Adhésion payée</label><div className="md:col-span-2 flex justify-end"><Button onClick={() => navigate("/register/step2")}>Continuer</Button></div></div></div>;
}
