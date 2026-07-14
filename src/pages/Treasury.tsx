import { useTreasury } from "@/db/useDb";
import { PageTitle, StatCard, money } from "@/pages/pageUtils";

export default function Treasury() {
  const { treasury } = useTreasury();
  return <div><PageTitle title="Caisse" subtitle="Adhésions, cotisations, réserves et versements" /><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5"><StatCard label="Solde" value={money(treasury.total_balance)} /><StatCard label="Collecté" value={money(treasury.total_contributions_collected)} /><StatCard label="Versements" value={money(treasury.total_payouts)} /><StatCard label="Réserves" value={money(treasury.retained_reserves)} /><StatCard label="En attente" value={money(treasury.pending_contributions)} /></div></div>;
}
