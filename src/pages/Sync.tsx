import { RealtimeDiagnostics } from "@/components/RealtimeDiagnostics";
import { SyncQueueWidget } from "@/components/SyncQueueWidget";
import { PageTitle } from "@/pages/pageUtils";

export default function Sync() {
  return <div><PageTitle title="Données et sauvegarde" subtitle="Contrôle de la file hors ligne, retries et reconnexion" /><div className="grid gap-5 lg:grid-cols-2"><SyncQueueWidget /><RealtimeDiagnostics /></div></div>;
}
