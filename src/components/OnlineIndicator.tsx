import { Wifi, WifiOff, RefreshCw, CloudUpload, Radio } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useOnlineStatus } from "@/lib/online";
import { getRealtimeStatus } from "@/lib/realtime";
import { toast } from "sonner";

export function OnlineIndicator() {
  const { online, queueCount, syncing, syncNow } = useOnlineStatus();
  const [rt, setRt] = useState(getRealtimeStatus());

  useEffect(() => {
    const id = setInterval(() => setRt(getRealtimeStatus()), 2000);
    return () => clearInterval(id);
  }, []);

  const handleSync = async () => {
    const result = await syncNow();
    if (result.flushed > 0) toast.success(`${result.flushed} opération(s) synchronisée(s)`);
    else if (result.remaining > 0 || result.failed > 0) toast.error("Synchronisation bloquée", { description: `${result.remaining || result.failed} opération(s) restent en attente` });
    else toast.info("Aucune opération en attente");
  };

  return (
    <div className="flex items-center gap-1.5">
      {online ? (
        <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-success/10 text-success text-[10px] font-semibold uppercase tracking-wider border border-success/20">
          <Wifi className="h-3 w-3" /> En ligne
        </span>
      ) : (
        <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-destructive/10 text-destructive text-[10px] font-semibold uppercase tracking-wider border border-destructive/20 animate-pulse">
          <WifiOff className="h-3 w-3" /> Hors ligne
        </span>
      )}
      {online && rt.total > 0 && (
        <span
          className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-semibold border border-primary/20"
          title={`Realtime: ${rt.connected} sur ${rt.total} canaux connectés`}
        >
          <Radio className={`h-3 w-3 ${rt.connected === rt.total ? "" : "animate-pulse"}`} />
          {rt.connected} sur {rt.total}
        </span>
      )}
      {queueCount > 0 && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleSync}
          disabled={!online || syncing}
          className="h-7 px-2 text-[10px] gap-1 border-warning/40 text-warning hover:bg-warning/10"
          title={online ? "Synchroniser maintenant" : "Synchronisation à la reconnexion"}
        >
          {syncing ? <RefreshCw className="h-3 w-3 animate-spin" /> : <CloudUpload className="h-3 w-3" />}
          {queueCount}
        </Button>
      )}
    </div>
  );
}
