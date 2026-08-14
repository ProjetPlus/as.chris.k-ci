import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectItem } from "@/components/ui/select";
import { useContributions, useDeaths, useMembers, useSettings } from "@/db/useDb";
import { PageTitle, StatCard, fmtDate, money } from "@/pages/pageUtils";
import { fullName, today } from "@/lib/memberWorkflow";

export default function Deaths() {
  const { members } = useMembers();
  const { settings } = useSettings();
  const { deaths, registerPrincipalDeath } = useDeaths();
  const { contributions } = useContributions();

  const eligible = useMemo(() => members.filter((m) => m.status === "actif"), [members]);
  const [memberId, setMemberId] = useState(eligible[0]?.id || "");
  const [date, setDate] = useState(today());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const selected = members.find((m) => m.id === memberId);
  const payers = eligible.filter((m) => m.id !== memberId).length;

  const declare = async () => {
    setError("");
    if (!memberId) return setError("Sélectionnez le membre principal décédé.");
    if (!selected) return setError("Membre introuvable dans la base locale.");
    if (selected.status !== "actif") return setError("Seul un membre actif peut être déclaré décédé.");
    if (!date) return setError("La date du décès est obligatoire.");
    if (date > today()) return setError("La date du décès ne peut pas être dans le futur.");
    setBusy(true);
    try {
      const bundle = await registerPrincipalDeath(memberId, date);
      toast.success(
        `Décès enregistré · ${bundle.contributions.length} cotisation(s) générée(s)` +
        (bundle.successor ? ` · ${fullName(bundle.successor)} promu membre successeur` : " · aucun tutel renseigné"),
      );
      if (!bundle.successor) {
        setError("Décès enregistré, mais aucune personne de tutel n'était renseignée : aucun successeur n'a pu être promu.");
      }
      setMemberId("");
    } catch (e: any) {
      setError(e?.message || "La déclaration de décès a échoué.");
      toast.error(e?.message || "Déclaration impossible");
    } finally {
      setBusy(false);
    }
  };

  const collected = contributions.filter((c) => c.status === "payé" || c.status === "partiel").reduce((s, c) => s + Number(c.amount || 0), 0);

  return (
    <div>
      <PageTitle
        title="Décès et promotion"
        subtitle="Les cotisations ne sont générées qu'après une déclaration de décès. Le tutel devient membre successeur."
      />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <StatCard label="Décès déclarés" value={deaths.length} />
        <StatCard label="Cotisations générées" value={contributions.length} />
        <StatCard label="Cotisations encaissées" value={money(collected)} />
      </div>

      <section className="rounded-lg border bg-card p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <Label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Membre principal décédé</Label>
            <Select value={memberId} onValueChange={setMemberId}>
              <SelectItem value="">— Sélectionner —</SelectItem>
              {eligible.map((m) => <SelectItem key={m.id} value={m.id}>{fullName(m)} · {m.member_id}</SelectItem>)}
            </Select>
          </div>
          <div>
            <Label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Date du décès</Label>
            <Input type="date" max={today()} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button className="w-full" onClick={declare} disabled={busy}>
              {busy ? "Traitement…" : "Déclarer et promouvoir"}
            </Button>
          </div>
        </div>

        {selected && (
          <p className="mt-4 text-sm text-muted-foreground">
            Versement prévu {money(settings.principal_payout)} · {payers} cotisant(s) × {money(settings.contribution_amount)} ={" "}
            {money(payers * settings.contribution_amount)} attendus ·{" "}
            {selected.guardian?.first_name || selected.guardian?.last_name
              ? `Tutel : ${fullName(selected.guardian as any)}`
              : "Aucun tutel renseigné"}
          </p>
        )}

        {error && <p className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
        {eligible.length === 0 && <p className="mt-4 text-sm text-muted-foreground">Aucun membre actif : la déclaration de décès est indisponible.</p>}
      </section>

      <div className="mt-6 grid gap-3">
        {deaths.map((d) => {
          const list = contributions.filter((c) => c.death_id === d.id);
          const paid = list.filter((c) => c.status === "payé").length;
          return (
            <article key={d.id} className="rounded-lg border bg-card p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong>{d.deceased_name} · {d.deceased_member_id}</strong>
                <span className="text-sm text-muted-foreground">{fmtDate(d.date_of_death)}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Attendu {money(d.total_expected_contributions)} · Versé {money(d.payout)} · Retenu {money(d.retained)} ·{" "}
                {paid}/{list.length} cotisation(s) payée(s)
              </p>
            </article>
          );
        })}
        {deaths.length === 0 && <p className="rounded-lg border bg-card p-6 text-muted-foreground">Aucun décès déclaré — aucune cotisation n'est due.</p>}
      </div>
    </div>
  );
}
