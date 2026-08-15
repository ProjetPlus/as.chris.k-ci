import { useMemo } from "react";
import { useTreasury } from "@/db/useDb";
import { PageTitle, StatCard, money } from "@/pages/pageUtils";

const NATURE_LABELS: Record<string, string> = {
  pret: "Prêt",
  assistance: "Assistance",
  fonctionnement: "Fonctionnement",
  evenement: "Événement",
  autre: "Autre",
};

function frDate(value?: string) {
  if (!value) return "—";
  const [y, m, d] = value.slice(0, 10).split("-");
  return `${d}.${m}.${y}`;
}

export default function Treasury() {
  const { treasury, expenses } = useTreasury();

  const stats = useMemo(() => {
    const valid = expenses.filter((e) => e.status !== "annulé");
    const total = valid.reduce((s, e) => s + Number(e.amount || 0), 0);
    const byNature = valid.reduce<Record<string, number>>((acc, e) => {
      acc[e.nature] = (acc[e.nature] || 0) + Number(e.amount || 0);
      return acc;
    }, {});
    return { total, count: valid.length, byNature };
  }, [expenses]);

  // Contrôle de cohérence caisse : solde = collecté − versements + réserves.
  const expected = treasury.total_contributions_collected - treasury.total_payouts + treasury.retained_reserves;
  const drift = treasury.total_balance - expected;

  const sorted = useMemo(
    () => [...expenses].sort((a, b) => String(b.date).localeCompare(String(a.date))),
    [expenses],
  );

  return (
    <div className="space-y-8">
      <PageTitle title="Caisse" subtitle="Adhésions, cotisations, réserves, versements et dépenses exceptionnelles" />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Solde" value={money(treasury.total_balance)} />
        <StatCard label="Collecté" value={money(treasury.total_contributions_collected)} />
        <StatCard label="Versements & dépenses" value={money(treasury.total_payouts)} />
        <StatCard label="Réserves" value={money(treasury.retained_reserves)} />
        <StatCard label="En attente" value={money(treasury.pending_contributions)} />
      </div>

      <section className="rounded-lg border bg-card p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-foreground">Dépenses exceptionnelles</h2>
            <p className="text-sm text-muted-foreground">{stats.count} opération(s) validée(s)</p>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Total dépenses</div>
            <div className="font-display text-2xl font-bold text-bordeaux">{money(stats.total)}</div>
          </div>
        </div>

        {Object.keys(stats.byNature).length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {Object.entries(stats.byNature).map(([nature, amount]) => (
              <span key={nature} className="rounded-full border bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
                {NATURE_LABELS[nature] || nature} · <strong className="text-foreground">{money(amount)}</strong>
              </span>
            ))}
          </div>
        )}

        {sorted.length === 0 ? (
          <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            Aucune dépense enregistrée. Ajoutez-en depuis « Dépenses exceptionnelles ».
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">Motif</th>
                  <th className="py-2 pr-3">Nature</th>
                  <th className="py-2 pr-3">Bénéficiaire</th>
                  <th className="py-2 pr-3">Statut</th>
                  <th className="py-2 pr-3 text-right">Montant</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((e) => (
                  <tr key={e.id} className="border-b last:border-0">
                    <td className="py-2 pr-3 whitespace-nowrap">{frDate(e.date)}</td>
                    <td className="py-2 pr-3">{e.motif || "—"}</td>
                    <td className="py-2 pr-3">{NATURE_LABELS[e.nature] || e.nature}</td>
                    <td className="py-2 pr-3">{e.beneficiary || "—"}</td>
                    <td className="py-2 pr-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${e.status === "annulé" ? "bg-muted text-muted-foreground line-through" : "bg-primary/10 text-primary"}`}>
                        {e.status}
                      </span>
                    </td>
                    <td className={`py-2 pr-3 text-right font-semibold ${e.status === "annulé" ? "text-muted-foreground line-through" : ""}`}>
                      {money(e.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-lg border bg-card p-5 shadow-sm">
        <h2 className="mb-2 font-display text-lg font-bold text-foreground">Contrôle de cohérence</h2>
        <p className="text-sm text-muted-foreground">
          Solde attendu : <strong className="text-foreground">{money(expected)}</strong> · Solde enregistré :{" "}
          <strong className="text-foreground">{money(treasury.total_balance)}</strong>
        </p>
        <p className={`mt-2 text-sm font-semibold ${drift === 0 ? "text-emerald-600" : "text-destructive"}`}>
          {drift === 0 ? "Caisse cohérente — aucun écart détecté." : `Écart détecté : ${money(drift)}`}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">Dernière mise à jour : {new Date(treasury.updated_at).toLocaleString("fr-FR").replace(/\//g, ".")}</p>
      </section>
    </div>
  );
}
