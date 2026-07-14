import type { TableName } from "@/db/database";

export type ChannelDiag = {
  table: TableName;
  status: "idle" | "subscribing" | "subscribed" | "error" | "closed";
  listeners: number;
  errorCount: number;
  resubscribeCount: number;
  lastEventAt?: number;
  lastEventType?: string;
  lastError?: string;
};

const tables: TableName[] = ["members", "deaths", "contributions", "treasury", "settings"];
const diag = new Map<TableName, ChannelDiag>(tables.map((table) => [table, { table, status: navigator.onLine ? "subscribed" : "closed", listeners: 1, errorCount: 0, resubscribeCount: 0 }]));
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((cb) => cb());

window.addEventListener("online", () => {
  tables.forEach((table) => diag.set(table, { ...diag.get(table)!, status: "subscribed", resubscribeCount: (diag.get(table)?.resubscribeCount || 0) + 1 }));
  console.info(`[realtime] network online -> resubscribing ${tables.length} channels`);
  notify();
});
window.addEventListener("offline", () => {
  tables.forEach((table) => diag.set(table, { ...diag.get(table)!, status: "closed" }));
  console.info("[realtime] network offline -> tearing down channels");
  notify();
});
window.addEventListener("aschrisk:data", (e: any) => {
  const table = e.detail?.table as TableName | undefined;
  if (table && diag.has(table)) diag.set(table, { ...diag.get(table)!, lastEventAt: Date.now(), lastEventType: "local" });
  notify();
});

export function getRealtimeDiagnostics() { return Array.from(diag.values()); }
export function getRealtimeStatus() { const all = getRealtimeDiagnostics(); return { total: all.length, connected: all.filter((d) => d.status === "subscribed").length }; }
export function onDiagChange(cb: () => void) { listeners.add(cb); return () => listeners.delete(cb); }
