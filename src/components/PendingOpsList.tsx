import { useEffect, useState } from "react";
import { Clock, RefreshCw, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getQueue, onSyncEvent, type QueueEntry } from "@/lib/offline";

export function PendingOpsList() {
  const [items, setItems] = useState<QueueEntry[]>(getQueue());
  useEffect(() => {
    const refresh = () => setItems(getQueue());
    const off = onSyncEvent(refresh);
    const handler = () => refresh();
    window.addEventListener("aschrisk:queue", handler);
    const id = setInterval(refresh, 2500);
    return () => { off(); window.removeEventListener("aschrisk:queue", handler); clearInterval(id); };
  }, []);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4" /> Opérations en attente ({items.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground">Aucune opération en attente.</p>
        ) : (
          <div className="max-h-96 space-y-2 overflow-auto">
            {items.map((e) => (
              <div key={e.id} className="rounded border border-border/60 p-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-secondary px-1.5 py-0.5 font-mono">{e.op}</span>
                  <span className="font-semibold">{e.table}</span>
                  {e.attempts > 0 && (
                    <span className="ml-auto flex items-center gap-1 rounded bg-warning/10 px-1.5 py-0.5 text-warning">
                      <RefreshCw className="h-3 w-3" /> retry {e.attempts}
                    </span>
                  )}
                </div>
                <div className="mt-1 text-[10px] text-muted-foreground">
                  Créée {new Date(e.createdAt).toLocaleString("fr-FR")}
                </div>
                {e.lastError && (
                  <div className="mt-1 flex items-start gap-1 text-destructive">
                    <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                    <span className="break-words">{e.lastError}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
