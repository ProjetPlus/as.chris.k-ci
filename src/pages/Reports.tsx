import { Button } from "@/components/ui/button";
import { useReportsData } from "@/db/useDb";
import { csvDownload, fmtDate, money, PageTitle } from "@/pages/pageUtils";
import { fullName } from "@/lib/memberWorkflow";

export default function Reports() {
  const data = useReportsData();
  
  const exportMembers = () => csvDownload("fiches_membres.csv", data.members.map((m) => ({
    identifiant: m.member_id,
    nom: fullName(m),
    telephone: m.phone,
    campement: m.campement,
    tutel: fullName(m.guardian),
    ayants_droit: m.secondary_members.map(fullName).join(" et "),
    adhesion: money(m.adhesion_amount || 0),
    inscription: fmtDate(m.registration_date)
  })));

  const exportLate = () => csvDownload("retards_cotisations.csv", data.contributions.filter((c) => c.status !== "payé").map((c) => ({
    membre: c.member_name,
    attendu: money(c.expected_amount),
    paye: money(c.amount),
    reste: money(c.expected_amount - c.amount)
  })));

  const exportBooklet = () => {
    // Generate an expanded list where each person (primary + secondary) is a row
    const rows: any[] = [];
    data.members.forEach(m => {
      rows.push({
        type: "Titulaire",
        id: m.member_id,
        nom: fullName(m),
        telephone: m.phone,
        campement: m.campement,
        statut: m.status
      });
      m.secondary_members.forEach(s => {
        rows.push({
          type: "Ayant-droit",
          id: `AD-${m.member_id}`,
          nom: fullName(s),
          telephone: "-",
          campement: m.campement,
          statut: s.status
        });
      });
    });
    csvDownload("donnees_carnet_A5.csv", rows);
  };

  return (
    <div>
      <PageTitle title="Exports & Rapports" subtitle="Fiches, retards et données pour carnets A5 sans slash" />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase">Membres</h3>
          <Button onClick={exportMembers}>Fiches membres (.csv)</Button>
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase">Finances</h3>
          <Button variant="outline" onClick={exportLate}>Retards cotisations (.csv)</Button>
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase">Imprimerie</h3>
          <Button variant="secondary" onClick={exportBooklet}>Données carnet A5 (.csv)</Button>
        </div>
      </div>
    </div>
  );
}
