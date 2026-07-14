import { Button } from "@/components/ui/button";
import { useReportsData } from "@/db/useDb";
import { csvDownload, fmtDate, money, PageTitle } from "@/pages/pageUtils";
import { fullName } from "@/lib/memberWorkflow";

const safe = (value: unknown) => String(value ?? "").split("/").join(" ");

export default function Reports() {
  const data = useReportsData();
  
  const exportMembers = () => csvDownload("fiches_membres.csv", data.members.map((m) => ({
    identifiant: safe(m.member_id),
    nom: safe(fullName(m)),
    telephone: safe(m.phone),
    whatsapp: safe(m.whatsapp),
    campement: safe(m.campement),
    sous_prefecture: safe(m.sous_prefecture),
    statut: safe(m.status),
    tutel: safe(fullName(m.guardian)),
    telephone_tutel: safe(m.guardian?.phone),
    ayants_droit: safe(m.secondary_members.map((p) => `${fullName(p)} (${p.relationship || "Ayant droit"})`).join(" et ")),
    adhesion: money(m.adhesion_amount || 0),
    adhesion_payee: m.adhesion_paid ? "oui" : "non",
    personnes_couvertes: m.total_covered_persons,
    inscription: fmtDate(m.registration_date)
  })));

  const exportLate = () => csvDownload("retards_cotisations.csv", data.contributions.filter((c) => c.status !== "payé").map((c) => ({
    membre: safe(c.member_name),
    identifiant: safe(c.member_id),
    deces: safe(data.deaths.find((d) => d.id === c.death_id)?.deceased_name),
    attendu: money(c.expected_amount),
    paye: money(c.amount),
    reste: money(Math.max(c.expected_amount - c.amount, 0)),
    statut: safe(c.status)
  })));

  const exportBooklet = () => {
    // Generate an expanded list where each person (primary + secondary) is a row
    const rows: any[] = [];
    data.members.forEach(m => {
      rows.push({
        type: "Titulaire",
          id: safe(m.member_id),
          nom: safe(fullName(m)),
          telephone: safe(m.phone),
          campement: safe(m.campement),
          tutel: safe(fullName(m.guardian)),
          montant_adhesion: money(m.adhesion_amount || 0),
          statut: safe(m.status)
      });
      m.secondary_members.forEach(s => {
        rows.push({
          type: "Ayant-droit",
            id: safe(`AD-${m.member_id}`),
            nom: safe(fullName(s)),
          telephone: "-",
            campement: safe(m.campement),
            tutel: safe(fullName(m.guardian)),
            montant_adhesion: money(m.adhesion_amount || 0),
            statut: safe(s.status)
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
