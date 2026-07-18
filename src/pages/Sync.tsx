import { RealtimeDiagnostics } from "@/components/RealtimeDiagnostics";
import { SyncQueueWidget } from "@/components/SyncQueueWidget";
import { DiagnosticExport } from "@/components/DiagnosticExport";
import { PendingOpsList } from "@/components/PendingOpsList";
import { PrecacheCheck } from "@/components/PrecacheCheck";
import { PageTitle } from "@/pages/pageUtils";

export default function Sync() {
  return (
    <div>
      <PageTitle title="Données et sauvegarde" subtitle="File hors ligne, retries avec backoff, pré-cache et diagnostic" />
      <div className="grid gap-5 lg:grid-cols-2">
        <SyncQueueWidget />
        <RealtimeDiagnostics />
        <PendingOpsList />
        <PrecacheCheck />
        <DiagnosticExport />
      </div>
    </div>
  );
}
