import { Button } from "@/components/ui/button";
import { useReportsData } from "@/db/useDb";
import { csvDownload, fmtDate, money, PageTitle } from "@/pages/pageUtils";
import { fullName } from "@/lib/memberWorkflow";

export default function Reports() {
  const data = useReportsData();
  const exportMembers = () => csvDownload("fiches_membres.csv", data.members.map((m) => ({ identifiant: m.member_id, nom: fullName(m), telephone: m.phone, campement: m.campement, tutel: fullName(m.guardian), ayants_droit: m.secondary_members.map(fullName).join(" et "), adhesion: money(m.adhesion_amount || 0), inscription: fmtDate(m.registration_date) })));
  const exportLate = () => csvDownload("retards_cotisations.csv", data.contributions.filter((c) => c.status !== "payé").map((c) => ({ membre: c.member_name, attendu: money(c.expected_amount), paye: money(c.amount), reste: money(c.expected_amount - c.amount) })));
  return <div><PageTitle title="Exports" subtitle="Fiches, retards, carnets A5 et fichiers propres sans slash" /><div className="grid gap-4 md:grid-cols-3"><Button onClick={exportMembers}>Exporter fiches</Button><Button variant="outline" onClick={exportLate}>Exporter retards</Button><Button variant="secondary" onClick={exportMembers}>Exporter carnet A5</Button></div></div>;
}
