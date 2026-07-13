import { useEffect, useState } from "react";
import { Activity, Wifi, WifiOff, AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getRealtimeDiagnostics, onDiagChange, type ChannelDiag } from "@/lib/realtime";
import { getQueue, isOnline } from "@/lib/offline";

function timeAgo(ts?: number) {
  if (!ts) return "—";
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h`;
}

const STATUS_BADGE: Record<ChannelDiag["status"], { color: string; icon: any; label: string }> = {
  idle: { color: "bg-muted text-muted-foreground", icon: Activity, label: "En attente" },
  subscribing: { color: "bg-warning/20 text-warning border-warning/30", icon: RefreshCw, label: "Connexion…" },
  subscribed: { color: "bg-success/20 text-success border-success/30", icon: CheckCircle2, label: "Connecté" },
  error: { color: "bg-destructive/20 text-destructive border-destructive/30", icon: AlertTriangle, label: "Erreur" },
  closed: { color: "bg-muted text-muted-foreground", icon: WifiOff, label: "Fermé" },
};

export function RealtimeDiagnostics() {
  const [diag, setDiag] = useState<ChannelDiag[]>(getRealtimeDiagnostics());
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const unsub = onDiagChange(() => setDiag(getRealtimeDiagnostics()));
    const interval = setInterval(() => { setDiag(getRealtimeDiagnostics()); setTick((t) => t + 1); }, 2000);
    return () => { unsub(); clearInterval(interval); };
  }, []);

  const queueSize = getQueue().length;
  const online = isOnline();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4" />
          Diagnostic Realtime & Synchronisation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className={`flex items-center gap-2 p-3 rounded-lg border ${online ? "bg-success/10 border-success/30 text-success" : "bg-destructive/10 border-destructive/30 text-destructive"}`}>
            {online ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
            <div className="text-xs font-semibold">{online ? "En ligne" : "Hors ligne"}</div>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg border bg-card">
            <RefreshCw className="h-4 w-4" />
            <div className="text-xs">
              <span className="font-semibold">{queueSize}</span> opération(s) en file
            </div>
          </div>
        </div>

        {diag.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Aucun canal realtime actif. Naviguez dans l'application pour activer les abonnements.</p>
        ) : (
          <div className="space-y-2">
            {diag.map((d) => {
              const cfg = STATUS_BADGE[d.status];
              const Icon = cfg.icon;
              return (
                <div key={d.table} className="flex items-start justify-between gap-2 p-3 rounded-lg border bg-card">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono font-semibold">{d.table}</code>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cfg.color}`}>
                        <Icon className={`h-3 w-3 ${d.status === "subscribing" ? "animate-spin" : ""}`} />
                        {cfg.label}
                      </span>
                    </div>
                    <div className="mt-1 grid grid-cols-2 gap-x-3 text-[10px] text-muted-foreground">
                      <span>Listeners : <b>{d.listeners}</b></span>
                      <span>Erreurs : <b>{d.errorCount}</b></span>
                      <span>Resub : <b>{d.resubscribeCount}</b></span>
                      <span>Dernier event : <b>{timeAgo(d.lastEventAt)}</b>{d.lastEventType ? ` (${d.lastEventType})` : ""}</span>
                    </div>
                    {d.lastError && (
                      <div className="mt-1 text-[10px] text-destructive break-all">⚠ {d.lastError}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="text-[10px] text-muted-foreground">
          Mis à jour {tick > 0 ? "automatiquement" : "à l'instant"} • Ouvrez la console pour voir les logs <code>[realtime]</code>.
        </div>

        <Button variant="outline" size="sm" onClick={() => setDiag(getRealtimeDiagnostics())} className="w-full">
          <RefreshCw className="h-3 w-3 mr-2" /> Rafraîchir
        </Button>
      </CardContent>
    </Card>
  );
}
