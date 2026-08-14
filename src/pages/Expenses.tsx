import { useMemo, useState } from "react";
import { Plus, Trash2, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectItem } from "@/components/ui/select";
import { useExpenses, useMembers } from "@/db/useDb";
import { PageTitle, StatCard, fmtDate, money } from "@/pages/pageUtils";
import { fullName, today } from "@/lib/memberWorkflow";
import type { DbExpense } from "@/db/database";

export const EXPENSE_NATURES = [
  { value: "pret", label: "Prêt" },
  { value: "assistance_maladie", label: "Assistance maladie" },
  { value: "soutien", label: "Soutien / solidarité" },
  { value: "funerailles", label: "Funérailles" },
  { value: "fonctionnement", label: "Fonctionnement" },
  { value: "autre", label: "Autre" },
];

export const EXPENSE_METHODS = [
  { value: "especes", label: "Espèces" },
  { value: "wave", label: "Wave" },
  { value: "orange", label: "Orange Money" },
  { value: "mtn", label: "MTN Money" },
  { value: "moov", label: "Moov Money" },
  { value: "virement", label: "Virement bancaire" },
];

export const EXPENSE_STATUSES = [
  { value: "validé", label: "Validé" },
  { value: "en_attente", label: "En attente" },
  { value: "annulé", label: "Annulé" },
];

const labelOf = (list: { value: string; label: string }[], v?: string) => list.find((o) => o.value === v)?.label || v || "—";

const emptyForm = (): Partial<DbExpense> => ({
  date: today(), motif: "", nature: "autre", amount: 0, beneficiary: "", beneficiary_member_id: "",
  responsible: "", payment_method: "especes", reference: "", status: "validé", notes: "",
});

export default function Expenses() {
  const { expenses, saveExpense, deleteExpense } = useExpenses();
  const { members } = useMembers();
  const [form, setForm] = useState<Partial<DbExpense>>(emptyForm());
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (patch: Partial<DbExpense>) => setForm((f) => ({ ...f, ...patch }));

  const totals = useMemo(() => {
    const valid = expenses.filter((e) => e.status !== "annulé");
    return {
      total: valid.reduce((s, e) => s + Number(e.amount || 0), 0),
      pending: expenses.filter((e) => e.status === "en_attente").reduce((s, e) => s + Number(e.amount || 0), 0),
      count: expenses.length,
    };
  }, [expenses]);

  const submit = async () => {
    setError("");
    if (!form.motif?.trim()) return setError("Le motif est obligatoire.");
    if (!Number(form.amount)) return setError("Le montant doit être supérieur à zéro.");
    if (!form.beneficiary?.trim()) return setError("Le bénéficiaire est obligatoire.");
    if (!form.responsible?.trim()) return setError("Le responsable / mandataire est obligatoire.");
    setSaving(true);
    try {
      await saveExpense(form);
      toast.success("Dépense enregistrée — caisse mise à jour");
      setForm(emptyForm());
      setOpen(false);
    } catch (e: any) {
      setError(e?.message || "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  };

  const edit = (e: DbExpense) => { setForm({ ...e }); setOpen(true); setError(""); };

  const remove = async (e: DbExpense) => {
    try { await deleteExpense(e.id); toast.success("Dépense supprimée"); }
    catch (err: any) { toast.error(err?.message || "Suppression impossible"); }
  };

  return (
    <div>
      <PageTitle title="Dépenses exceptionnelles" subtitle="Sorties d'argent hors cotisations — traçabilité et audit" />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <StatCard label="Total décaissé" value={money(totals.total)} />
        <StatCard label="En attente" value={money(totals.pending)} />
        <StatCard label="Écritures" value={totals.count} />
      </div>

      <div className="mb-4">
        <Button onClick={() => { setForm(emptyForm()); setOpen((o) => !o); setError(""); }}>
          {open ? <X className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
          {open ? "Fermer le formulaire" : "Nouvelle dépense"}
        </Button>
      </div>

      {open && (
        <section className="mb-8 rounded-lg border bg-card p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Field label="Date">
              <Input type="date" value={form.date || ""} onChange={(e) => set({ date: e.target.value })} />
            </Field>
            <Field label="Motif *">
              <Input value={form.motif || ""} onChange={(e) => set({ motif: e.target.value })} placeholder="Ex. Assistance maladie membre" />
            </Field>
            <Field label="Nature">
              <Select value={form.nature || "autre"} onValueChange={(v) => set({ nature: v as DbExpense["nature"] })}>
                {EXPENSE_NATURES.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </Select>
            </Field>
            <Field label="Montant (FCFA) *">
              <Input type="number" min={0} value={form.amount ?? 0} onChange={(e) => set({ amount: Number(e.target.value) })} />
            </Field>
            <Field label="Bénéficiaire *">
              <Input value={form.beneficiary || ""} onChange={(e) => set({ beneficiary: e.target.value })} placeholder="Nom du bénéficiaire" />
            </Field>
            <Field label="Membre lié (facultatif)">
              <Select value={form.beneficiary_member_id || ""} onValueChange={(v) => {
                const m = members.find((x) => x.member_id === v);
                set({ beneficiary_member_id: v, beneficiary: m ? fullName(m) : form.beneficiary });
              }}>
                {members.map((m) => <SelectItem key={m.id} value={m.member_id}>{fullName(m)} · {m.member_id}</SelectItem>)}
              </Select>
            </Field>
            <Field label="Responsable / mandataire *">
              <Input value={form.responsible || ""} onChange={(e) => set({ responsible: e.target.value })} placeholder="Ex. Trésorier" />
            </Field>
            <Field label="Moyen de paiement">
              <Select value={form.payment_method || "especes"} onValueChange={(v) => set({ payment_method: v as DbExpense["payment_method"] })}>
                {EXPENSE_METHODS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </Select>
            </Field>
            <Field label="Référence / N° transaction">
              <Input value={form.reference || ""} onChange={(e) => set({ reference: e.target.value })} />
            </Field>
            <Field label="Statut">
              <Select value={form.status || "validé"} onValueChange={(v) => set({ status: v as DbExpense["status"] })}>
                {EXPENSE_STATUSES.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </Select>
            </Field>
            <div className="md:col-span-2 lg:col-span-3">
              <Label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Notes</Label>
              <Textarea rows={3} value={form.notes || ""} onChange={(e) => set({ notes: e.target.value })} />
            </div>
          </div>

          {error && <p className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

          <div className="mt-5 flex gap-3">
            <Button onClick={submit} disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer la dépense"}</Button>
            <Button variant="outline" onClick={() => { setOpen(false); setForm(emptyForm()); }}>Annuler</Button>
          </div>
        </section>
      )}

      <div className="grid gap-3">
        {expenses.map((e) => (
          <article key={e.id} className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="text-base">{e.motif}</strong>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] uppercase tracking-wide">{labelOf(EXPENSE_NATURES, e.nature)}</span>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] uppercase tracking-wide">{labelOf(EXPENSE_STATUSES, e.status)}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {fmtDate(e.date)} · Bénéficiaire : {e.beneficiary || "—"} · Responsable : {e.responsible || "—"} · {labelOf(EXPENSE_METHODS, e.payment_method)}
                  {e.reference ? ` · Réf. ${e.reference}` : ""}
                </p>
                {e.notes && <p className="mt-1 text-sm text-muted-foreground">{e.notes}</p>}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-primary">{money(e.amount)}</span>
                <Button size="icon" variant="ghost" onClick={() => edit(e)}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => remove(e)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
          </article>
        ))}
        {expenses.length === 0 && <p className="rounded-lg border bg-card p-6 text-muted-foreground">Aucune dépense enregistrée.</p>}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
