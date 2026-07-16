import { useEffect, useState } from "react";
import { CloudUpload, RefreshCw, ScrollText, Trash2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getLastSuccessfulSync, getLastSyncAttempt, getQueueStats, getSyncLog, clearSyncLog, onSyncEvent, type SyncLogEntry } from "@/lib/offline";
import { useOnlineStatus } from "@/lib/online";
import { toast } from "sonner";

export function SyncQueueWidget() {
  const { online, syncing, syncNow } = useOnlineStatus();
  const [stats, setStats] = useState(getQueueStats());
  const [log, setLog] = useState<SyncLogEntry[]>(getSyncLog());
  const [lastSync, setLastSync] = useState(getLastSuccessfulSync());
  const [lastAttempt, setLastAttempt] = useState(getLastSyncAttempt());
  const [showLog, setShowLog] = useState(false);

  useEffect(() => {
    const refresh = () => { setStats(getQueueStats()); setLog(getSyncLog()); setLastSync(getLastSuccessfulSync()); setLastAttempt(getLastSyncAttempt()); };
    const id = setInterval(refresh, 2000);
    const off = onSyncEvent(refresh);
    return () => { clearInterval(id); off(); };
  }, []);

  const handleSync = async () => {
    const result = await syncNow();
    setStats(getQueueStats());
    if (result.flushed > 0) toast.success(`${result.flushed} opération(s) synchronisée(s)`);
    else if (result.remaining > 0 || result.failed > 0) toast.error("Synchronisation bloquée", { description: `${result.remaining || result.failed} opération(s) restent en attente. Le journal affiche l'erreur exacte.` });
    else toast.info("Aucune opération en attente");
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <CloudUpload className="h-4 w-4 text-accent" /> File de synchronisation
        </CardTitle>
        <Button size="sm" variant="outline" onClick={handleSync} disabled={!online || syncing}>
          {syncing ? <RefreshCw className="h-3 w-3 animate-spin mr-1" /> : <CloudUpload className="h-3 w-3 mr-1" />}
          Synchroniser
        </Button>

      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="grid grid-cols-3 gap-2">
          <Stat label="En attente" value={stats.total} />
          <Stat label="Avec retries" value={stats.withRetries} />
          <Stat label="Plus ancien" value={stats.oldest ? new Date(stats.oldest).toLocaleTimeString() : "—"} />
        </div>
        <div className="grid gap-2 text-xs md:grid-cols-2">
          <div className="rounded border border-border/50 p-2">
            <span className="text-muted-foreground">Dernière sync réussie</span>
            <div className="font-semibold">{lastSync ? new Date(lastSync).toLocaleString("fr-FR") : "Jamais sur cet appareil"}</div>
          </div>
          <div className="rounded border border-border/50 p-2">
            <span className="text-muted-foreground">Dernière tentative</span>
            <div className="font-semibold">{lastAttempt ? new Date(lastAttempt).toLocaleString("fr-FR") : "Aucune"}</div>
          </div>
        </div>
        {stats.total > 0 && (
          <>
            <div>
              <div className="text-xs uppercase text-muted-foreground mb-1">Par opération</div>
              <div className="flex gap-2 text-xs">
                <span className="px-2 py-1 rounded bg-success/10 text-success">Insert: {stats.byOp.insert}</span>
                <span className="px-2 py-1 rounded bg-warning/10 text-warning">Update: {stats.byOp.update}</span>
                <span className="px-2 py-1 rounded bg-secondary">Batch: {stats.byOp.batch}</span>
                <span className="px-2 py-1 rounded bg-destructive/10 text-destructive">Delete: {stats.byOp.delete}</span>
              </div>
            </div>
            <div>
              <div className="text-xs uppercase text-muted-foreground mb-1">Par table</div>
              <div className="flex flex-wrap gap-2 text-xs">
                {Object.entries(stats.byTable).map(([t, n]) => (
                  <span key={t} className="px-2 py-1 rounded bg-secondary">{t}: {n}</span>
                ))}
              </div>
            </div>
          </>
        )}
        {stats.total === 0 && <p className="text-xs text-muted-foreground">Aucune opération en attente. Tout est synchronisé.</p>}

        <div className="pt-2 border-t border-border/40">
          <div className="flex items-center justify-between mb-2">
            <button onClick={() => setShowLog(s => !s)} className="text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground">
              <ScrollText className="h-3 w-3" /> Journal ({log.length}) {showLog ? "▾" : "▸"}
            </button>
            {log.length > 0 && (
              <button onClick={() => { clearSyncLog(); setLog([]); toast.success("Journal vidé"); }} className="text-xs flex items-center gap-1 text-muted-foreground hover:text-destructive">
                <Trash2 className="h-3 w-3" /> Vider
              </button>
            )}
          </div>
          {showLog && (
            <div className="max-h-64 overflow-auto space-y-1">
              {log.length === 0 && <p className="text-xs text-muted-foreground">Aucune opération enregistrée.</p>}
              {log.map((e) => (
                <div key={e.id + e.ts} className="grid gap-1 rounded bg-secondary/40 p-2 text-xs">
                  <div className="flex min-w-0 items-center gap-2">
                  {e.status === "pending" && <RefreshCw className="h-3 w-3 text-muted-foreground shrink-0" />}
                  {e.status === "success" && <CheckCircle2 className="h-3 w-3 text-success shrink-0" />}
                  {e.status === "failed" && <AlertTriangle className="h-3 w-3 text-warning shrink-0" />}
                  {e.status === "dropped" && <XCircle className="h-3 w-3 text-destructive shrink-0" />}
                  <span className="font-mono shrink-0">{new Date(e.ts).toLocaleTimeString()}</span>
                  <span className="font-semibold">{e.op}</span>
                  <span className="text-muted-foreground">{e.table}</span>
                  {typeof e.attempts === "number" && e.attempts > 0 && <span className="ml-auto rounded bg-warning/10 px-1.5 py-0.5 text-warning">retry {e.attempts}</span>}
                  </div>
                  {e.details && <div className="truncate text-muted-foreground" title={e.details}>{e.details}</div>}
                  {e.error && <div className="break-words text-destructive" title={e.error}>{e.error}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="p-2 rounded border border-border/50">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="text-base font-semibold">{value}</div>
    </div>
  );
}
