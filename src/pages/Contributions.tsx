import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useContributions } from "@/db/useDb";
import { PageTitle, money } from "@/pages/pageUtils";

export default function Contributions() {
  const { contributions, updateContribution } = useContributions();
  return <div><PageTitle title="Cotisations" subtitle="Montants générés depuis les relations actuelles" /><div className="grid gap-3">{contributions.map((c) => <article key={c.id} className="rounded-lg border bg-card p-4 grid gap-3 md:grid-cols-[1fr_140px_120px]"><div><strong>{c.member_name}</strong><p className="text-sm text-muted-foreground">Attendu {money(c.expected_amount)} · Statut {c.status}</p></div><Input type="number" defaultValue={c.amount} onBlur={(e) => updateContribution(c.id, { amount: Number(e.target.value), status: Number(e.target.value) >= c.expected_amount ? "payé" : Number(e.target.value) > 0 ? "partiel" : "non_payé", date: new Date().toISOString().slice(0, 10) })} /><Button variant="outline" onClick={() => updateContribution(c.id, { amount: c.expected_amount, status: "payé", date: new Date().toISOString().slice(0, 10) })}>Payer</Button></article>)}{contributions.length === 0 && <p className="rounded-lg border bg-card p-6 text-muted-foreground">Aucune cotisation générée.</p>}</div></div>;
}
