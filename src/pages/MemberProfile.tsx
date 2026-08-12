import { useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, Upload, Plus, Trash2 } from "lucide-react";
import { useMembers, useSettings } from "@/db/useDb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectItem } from "@/components/ui/select";
import { MemberPhoto } from "@/components/MemberPhoto";
import { PageTitle, fmtDate, money } from "@/pages/pageUtils";
import { fullName, today, uuid } from "@/lib/memberWorkflow";
import { normalizeMemberPhoto } from "@/lib/photoBackground";
import type { DbMember } from "@/db/database";

const PAYMENT_METHODS = [
  { value: "especes", label: "Espèces" },
  { value: "wave", label: "Wave" },
  { value: "orange", label: "Orange Money" },
  { value: "mtn", label: "MTN Money" },
  { value: "moov", label: "Moov Money" },
];

const STATUSES: Array<{ value: DbMember["status"]; label: string }> = [
  { value: "actif", label: "Actif" },
  { value: "suspendu", label: "Suspendu" },
  { value: "archivé", label: "Archivé" },
  { value: "décédé", label: "Décédé" },
];

export default function MemberProfile() {
  const { id = "" } = useParams();
  const { getMember, updateMember } = useMembers();
  const { settings } = useSettings();
  const member = getMember(id);
  const photoInput = useRef<HTMLInputElement>(null);
  const [photoBusy, setPhotoBusy] = useState(false);

  if (!member) return <PageTitle title="Membre introuvable" />;

  const patch = async (p: Partial<DbMember>, label = "Modification enregistrée") => {
    try {
      await updateMember(member.id, p);
      toast.success(label);
    } catch (e: any) {
      toast.error(`Échec : ${e?.message || "modification impossible"}`);
    }
  };

  const handlePhoto = async (file: File) => {
    setPhotoBusy(true);
    try {
      const dataUrl = await normalizeMemberPhoto(file);
      await patch({ photo: dataUrl }, "Photo mise à jour (fond gris perle)");
    } catch {
      try {
        const raw = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(file); });
        await patch({ photo: raw }, "Photo mise à jour");
      } catch {
        toast.error("Impossible de charger la photo");
      }
    } finally {
      setPhotoBusy(false);
    }
  };

  const setGuardian = (k: string, v: string) => patch({ guardian: { ...member.guardian, [k]: v } });

  return (
    <div>
      <PageTitle title={fullName(member)} subtitle={`${member.member_id} · Inscrit le ${fmtDate(member.registration_date)}`} />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Button variant={member.status === "actif" ? "default" : "outline"} onClick={() => patch({ status: "actif" }, "Membre réactivé")}>Réactiver</Button>
        <Button variant="outline" onClick={() => patch({ status: "suspendu" }, "Membre suspendu")}>Suspendre</Button>
        <Button variant="outline" onClick={() => patch({ status: "archivé" }, "Membre archivé")}>Archiver</Button>
        <Button asChild variant="outline"><Link to="/cards">Voir la carte</Link></Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-lg border bg-card p-5 space-y-3">
          <h2 className="font-semibold">Photo de profil</h2>
          <div className="flex items-center gap-4">
            <MemberPhoto member={member} className="h-24 w-24" />
            <div className="space-y-2">
              <input ref={photoInput} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhoto(f); e.currentTarget.value = ""; }} />
              <Button variant="outline" disabled={photoBusy} onClick={() => photoInput.current?.click()}>
                {photoBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Changer la photo
              </Button>
              {member.photo && <Button variant="outline" size="sm" onClick={() => patch({ photo: "" }, "Photo retirée")}>Retirer</Button>}
            </div>
          </div>
        </section>

        <section className="rounded-lg border bg-card p-5 space-y-3">
          <h2 className="font-semibold">Statut et adhésion</h2>
          <div><Label>Statut</Label>
            <Select value={member.status} onValueChange={(v) => patch({ status: v as DbMember["status"] }, "Statut mis à jour")}>
              {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </Select>
          </div>
          <div><Label>Adhésion payée</Label>
            <Select value={member.adhesion_paid ? "oui" : "non"} onValueChange={(v) => patch({ adhesion_paid: v === "oui", adhesion_payment_date: v === "oui" ? (member.adhesion_payment_date || today()) : "" }, "Adhésion mise à jour")}>
              <SelectItem value="non">Non</SelectItem>
              <SelectItem value="oui">Oui</SelectItem>
            </Select>
          </div>
          <div><Label>Montant adhésion FCFA</Label><Input type="number" defaultValue={member.adhesion_amount || settings.adhesion_fee} onBlur={(e) => patch({ adhesion_amount: Number(e.target.value) })} /></div>
          <div><Label>Moyen de paiement</Label>
            <Select value={member.adhesion_payment_method || "especes"} onValueChange={(v) => patch({ adhesion_payment_method: v })}>
              {PAYMENT_METHODS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
            </Select>
          </div>
          <div><Label>ID transaction / référence</Label><Input defaultValue={member.adhesion_transaction_id || ""} onBlur={(e) => patch({ adhesion_transaction_id: e.target.value, adhesion_proof_type: "transaction_id" })} /></div>
          <p className="font-semibold">Adhésion {money(member.adhesion_amount || 0)} · {member.adhesion_paid ? "Payée" : "Impayée"}</p>
        </section>

        <section className="rounded-lg border bg-card p-5 space-y-3">
          <h2 className="font-semibold">Fiche principale</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <div><Label>Nom</Label><Input defaultValue={member.last_name} onBlur={(e) => patch({ last_name: e.target.value })} /></div>
            <div><Label>Prénoms</Label><Input defaultValue={member.first_name} onBlur={(e) => patch({ first_name: e.target.value })} /></div>
            <div><Label>Téléphone</Label><Input defaultValue={member.phone} onBlur={(e) => patch({ phone: e.target.value })} /></div>
            <div><Label>Téléphone secondaire</Label><Input defaultValue={member.phone_secondary || ""} onBlur={(e) => patch({ phone_secondary: e.target.value })} /></div>
            <div><Label>Campement</Label><Input defaultValue={member.campement} onBlur={(e) => patch({ campement: e.target.value })} /></div>
            <div><Label>Sous préfecture</Label><Input defaultValue={member.sous_prefecture} onBlur={(e) => patch({ sous_prefecture: e.target.value })} /></div>
            <div><Label>Type de pièce</Label><Input defaultValue={member.id_type} onBlur={(e) => patch({ id_type: e.target.value })} /></div>
            <div><Label>N° de pièce</Label><Input defaultValue={member.id_number || ""} onBlur={(e) => patch({ id_number: e.target.value })} /></div>
          </div>
        </section>

        <section className="rounded-lg border bg-card p-5 space-y-3">
          <h2 className="font-semibold">Personne de tutel</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <div><Label>Nom</Label><Input defaultValue={member.guardian?.last_name || ""} onBlur={(e) => setGuardian("last_name", e.target.value)} /></div>
            <div><Label>Prénom</Label><Input defaultValue={member.guardian?.first_name || ""} onBlur={(e) => setGuardian("first_name", e.target.value)} /></div>
            <div><Label>Téléphone</Label><Input defaultValue={member.guardian?.phone || ""} onBlur={(e) => setGuardian("phone", e.target.value)} /></div>
            <div><Label>Lien de parenté</Label><Input defaultValue={member.guardian?.relationship || ""} onBlur={(e) => setGuardian("relationship", e.target.value)} /></div>
            <div><Label>Campement</Label><Input defaultValue={member.guardian?.campement || ""} onBlur={(e) => setGuardian("campement", e.target.value)} /></div>
            <div><Label>Sous préfecture</Label><Input defaultValue={member.guardian?.sous_prefecture || ""} onBlur={(e) => setGuardian("sous_prefecture", e.target.value)} /></div>
          </div>
        </section>

        <section className="rounded-lg border bg-card p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Ayants droit ({member.secondary_members.length})</h2>
            <Button size="sm" variant="outline" onClick={() => patch({ secondary_members: [...member.secondary_members, { id: uuid(), first_name: "", last_name: "", relationship: "", status: "actif" }] }, "Ayant droit ajouté")}>
              <Plus className="h-4 w-4" /> Ajouter
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {member.secondary_members.map((p, idx) => (
              <div key={p.id || idx} className="rounded-md border p-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Input defaultValue={p.last_name} placeholder="Nom" onBlur={(e) => patch({ secondary_members: member.secondary_members.map((x, i) => i === idx ? { ...x, last_name: e.target.value } : x) })} />
                  <Input defaultValue={p.first_name} placeholder="Prénom" onBlur={(e) => patch({ secondary_members: member.secondary_members.map((x, i) => i === idx ? { ...x, first_name: e.target.value } : x) })} />
                  <Input defaultValue={p.relationship} placeholder="Lien" onBlur={(e) => patch({ secondary_members: member.secondary_members.map((x, i) => i === idx ? { ...x, relationship: e.target.value } : x) })} />
                  <Input defaultValue={p.phone || ""} placeholder="Téléphone" onBlur={(e) => patch({ secondary_members: member.secondary_members.map((x, i) => i === idx ? { ...x, phone: e.target.value } : x) })} />
                </div>
                <Button variant="outline" size="sm" onClick={() => patch({ secondary_members: member.secondary_members.filter((_, i) => i !== idx) }, "Ayant droit retiré")}>
                  <Trash2 className="h-4 w-4" /> Retirer
                </Button>
              </div>
            ))}
            {member.secondary_members.length === 0 && <p className="text-muted-foreground">Aucun ayant droit.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
