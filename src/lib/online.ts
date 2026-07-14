import { useEffect, useState } from "react";
import { flushQueue, getQueueStats, isOnline, onSyncEvent } from "@/lib/offline";
import { supabase } from "@/integrations/supabase/client";

export function useOnlineStatus() {
  const [online, setOnline] = useState(isOnline());
  const [queueCount, setQueueCount] = useState(getQueueStats().total);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const refresh = () => { setOnline(isOnline()); setQueueCount(getQueueStats().total); };
    window.addEventListener("online", refresh);
    window.addEventListener("offline", refresh);
    window.addEventListener("aschrisk:queue", refresh);
    const off = onSyncEvent(refresh);
    const id = setInterval(refresh, 2000);
    return () => { window.removeEventListener("online", refresh); window.removeEventListener("offline", refresh); window.removeEventListener("aschrisk:queue", refresh); off(); clearInterval(id); };
  }, []);

  const syncNow = async () => {
    setSyncing(true);
    try { return await flushQueue(supabase, { force: true }); }
    finally { setSyncing(false); setQueueCount(getQueueStats().total); }
  };

  return { online, queueCount, syncing, syncNow };
}
