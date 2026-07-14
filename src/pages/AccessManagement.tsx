import { Shield } from "lucide-react";
import { PageTitle } from "@/pages/pageUtils";

export default function AccessManagement() {
  return <div><PageTitle title="Gestion des accès" subtitle="Authentification par identifiant compatible hors ligne" /><section className="rounded-lg border bg-card p-6"><Shield className="h-10 w-10 text-primary" /><h2 className="mt-3 font-semibold">Comptes applicatifs</h2><p className="mt-2 text-muted-foreground">Le compte administrateur local reste disponible après une première ouverture sur l’appareil. Les fonctions de création et suppression côté base restent protégées par fonctions dédiées.</p></section></div>;
}
