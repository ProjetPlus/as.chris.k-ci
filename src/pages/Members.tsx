import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Trash2, Pencil, PauseCircle, PlayCircle, Archive, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useMembers, useSettings } from "@/db/useDb";
import { MemberPhoto } from "@/components/MemberPhoto";
import { PageTitle, fmtDate, money } from "@/pages/pageUtils";
import { fullName, today } from "@/lib/memberWorkflow";
import type { DbMember } from "@/db/database";

const PAYMENT_METHODS = [
  { value: "especes", label: "Espèces" },
  { value: "wave", label: "Wave" },
  { value: "orange", label: "Orange Money" },
  { value: "mtn", label: "MTN Money" },
  { value: "moov", label: "Moov Money" },
];

const STATUS_FILTERS = [
  { value: "tous", label: "Tous les statuts" },
  { value: "actif", label: "Actifs" },
  { value: "suspendu", label: "Suspendus" },
  { value: "archivé", label: "Archivés" },
  { value: "décédé", label: "Décédés" },
];

export default function Members() {
  const { members, updateMember, deleteMember } = useMembers();
  const { settings } = useSettings();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("tous");
  const [payFor, setPayFor] = useState<DbMember | null>(null);
  const [pay, setPay] = useState<any>({});

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return members.filter((m) => {
      if (status !== "tous" && m.status !== status) return false;
      if (!needle) return true;
      return `${fullName(m)} ${m.member_id} ${m.phone} ${m.campement}`.toLowerCase().includes(needle);
    });
  }, [members, q, status]);

  const setStatusOf = async (m: DbMember, next: DbMember["status"], label: string) => {
    try {
      await updateMember(m.id, { status: next });
      toast.success(`${fullName(m)} — ${label}`);
    } catch (e: any) {
      toast.error(`Échec : ${e?.message || "action impossible"}`);
    }
  };

  const openPay = (m: DbMember) => {
    setPayFor(m);
    setPay({
      adhesion_amount: m.adhesion_amount || settings.adhesion_fee,
      adhesion_payment_method: m.adhesion_payment_method || "especes",
      adhesion_payment_date: m.adhesion_payment_date || today(),
      adhesion_proof_type: m.adhesion_proof_type || "",
      adhesion_transaction_id: m.adhesion_transaction_id || "",
    });
  };

  const savePay = async () => {
    if (!payFor) return;
    try {
      await updateMember(payFor.id, { ...pay, adhesion_amount: Number(pay.adhesion_amount || 0), adhesion_paid: true });
      toast.success("Paiement d'adhésion enregistré — caisse mise à jour");
      setPayFor(null);
    } catch (e: any) {
      toast.error(`Échec de l'enregistrement : ${e?.message || "inconnu"}`);
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PageTitle title="Membres" subtitle="Modifier, suspendre, réactiver, archiver et encaisser l'adhésion" />
        <Button asChild><Link to="/register"><Plus className="h-4 w-4" /> Nouveau membre</Link></Button>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_220px]">
        <Input placeholder="Rechercher un membre, un numéro, un campement…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select value={status} onValueChange={setStatus}>
          {STATUS_FILTERS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
        </Select>
      </div>

      <div className="grid gap-3">
        {list.map((m) => (
          <article key={m.id} className="rounded-lg border bg-card p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <MemberPhoto member={m} className="h-14 w-14" />
              <div>
                <Link to={`/members/${m.id}`} className="text-lg font-semibold text-primary">{fullName(m)}</Link>
                <p className="font-mono text-sm">{m.member_id}</p>
                <p className="text-sm text-muted-foreground">{m.campement} · {m.sous_prefecture} · {fmtDate(m.registration_date)}</p>
                <p className="text-sm">Ayants droit {m.secondary_members.length} · Tutel {fullName(m.guardian)}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold">{m.status}</span>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${m.adhesion_paid ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>
                {m.adhesion_paid ? `Adhésion ${money(m.adhesion_amount || 0)}` : "Adhésion impayée"}
              </span>
              <Button asChild variant="outline" size="icon" title="Modifier"><Link to={`/members/${m.id}`}><Pencil className="h-4 w-4" /></Link></Button>
              <Button variant="outline" size="icon" title="Enregistrer l'adhésion" onClick={() => openPay(m)}><Wallet className="h-4 w-4" /></Button>
              {m.status === "actif" ? (
                <Button variant="outline" size="icon" title="Suspendre" onClick={() => setStatusOf(m, "suspendu", "suspendu")}><PauseCircle className="h-4 w-4" /></Button>
              ) : m.status !== "décédé" ? (
                <Button variant="outline" size="icon" title="Réactiver" onClick={() => setStatusOf(m, "actif", "réactivé")}><PlayCircle className="h-4 w-4" /></Button>
              ) : null}
              {m.status !== "archivé" && m.status !== "décédé" && (
                <Button variant="outline" size="icon" title="Archiver" onClick={() => setStatusOf(m, "archivé", "archivé")}><Archive className="h-4 w-4" /></Button>
              )}
              <Button variant="outline" size="icon" onClick={() => { if (confirm(`Supprimer définitivement ${fullName(m)} ?`)) deleteMember(m.id); }} title="Supprimer"><Trash2 className="h-4 w-4" /></Button>
            </div>
          </article>
        ))}
        {list.length === 0 && <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">Aucun membre pour ce filtre.</div>}
      </div>

      <Dialog open={payFor !== null} onOpenChange={(o) => !o && setPayFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Paiement d'adhésion — {payFor ? fullName(payFor) : ""}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>Montant FCFA</Label><Input type="number" value={pay.adhesion_amount ?? ""} onChange={(e) => setPay({ ...pay, adhesion_amount: e.target.value })} /></div>
            <div><Label>Moyen de paiement</Label>
              <Select value={pay.adhesion_payment_method} onValueChange={(v) => setPay({ ...pay, adhesion_payment_method: v })}>
                {PAYMENT_METHODS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </Select>
            </div>
            <div><Label>Date du paiement</Label><Input type="date" value={pay.adhesion_payment_date || ""} onChange={(e) => setPay({ ...pay, adhesion_payment_date: e.target.value })} /></div>
            <div><Label>ID transaction (mobile money)</Label><Input value={pay.adhesion_transaction_id || ""} onChange={(e) => setPay({ ...pay, adhesion_transaction_id: e.target.value, adhesion_proof_type: "transaction_id" })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayFor(null)}>Annuler</Button>
            <Button onClick={savePay}>Enregistrer le paiement</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
