import type { SupabaseClient } from "@supabase/supabase-js";
import type { DbContribution, DbDeath, DbMember, DbSettings, DbTreasury, TableName } from "@/db/database";

export type QueueOp = "insert" | "update" | "delete" | "batch";
export type QueueEntry = {
  id: string;
  op: QueueOp;
  table: TableName | "member_bundle" | "death_promotion";
  payload: any;
  createdAt: number;
  attempts: number;
  status?: "success" | "failed" | "pending";
  lastError?: string;
};
export type SyncLogEntry = { id: string; ts: number; op: QueueOp; table: string; status: "success" | "failed" | "dropped"; error?: string };
export type SyncEvent = { type: "item"; entry: QueueEntry; flushed: number } | { type: "done"; flushed: number; failed: number; remaining: number };

const QUEUE_KEY = "aschrisk.sync.queue.v3";
const LOG_KEY = "aschrisk.sync.log.v1";
const AUTH_KEY = "aschrisk.offline.auth.v2";
const MAX_LOG = 80;
const listeners = new Set<(e: SyncEvent) => void>();
let syncing = false;

const read = <T,>(key: string, fallback: T): T => {
  try { return JSON.parse(localStorage.getItem(key) || "") as T; } catch { return fallback; }
};
const write = (key: string, value: unknown) => localStorage.setItem(key, JSON.stringify(value));
const id = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;

export function isOnline() { return typeof navigator === "undefined" ? true : navigator.onLine; }
export function getQueue(): QueueEntry[] { return read<QueueEntry[]>(QUEUE_KEY, []); }
export function setQueue(q: QueueEntry[]) { write(QUEUE_KEY, q); window.dispatchEvent(new Event("aschrisk:queue")); }
export function getSyncLog(): SyncLogEntry[] { return read<SyncLogEntry[]>(LOG_KEY, []); }
export function clearSyncLog() { write(LOG_KEY, []); }
export function onSyncEvent(cb: (e: SyncEvent) => void) { listeners.add(cb); return () => listeners.delete(cb); }
const emit = (e: SyncEvent) => listeners.forEach((cb) => cb(e));
const log = (entry: QueueEntry, status: SyncLogEntry["status"], error?: string) => write(LOG_KEY, [{ id: entry.id, ts: Date.now(), op: entry.op, table: entry.table, status, error }, ...getSyncLog()].slice(0, MAX_LOG));

export function enqueue(entry: Omit<QueueEntry, "id" | "createdAt" | "attempts"> & Partial<Pick<QueueEntry, "id" | "attempts">>) {
  const q = getQueue();
  const item: QueueEntry = { id: entry.id || id(), createdAt: Date.now(), attempts: entry.attempts || 0, op: entry.op, table: entry.table, payload: entry.payload };
  q.push(item);
  setQueue(q);
  return item;
}

export function enqueueMemberBundle(member: DbMember) {
  return enqueue({ op: "batch", table: "member_bundle", payload: { member: sanitizeMember(member) } });
}

export function enqueueDeathPromotion(payload: { updatedDeceased: DbMember; successor?: DbMember | null; death: DbDeath; contributions: DbContribution[] }) {
  return enqueue({ op: "batch", table: "death_promotion", payload });
}

export function getQueueStats() {
  const q = getQueue();
  return {
    total: q.length,
    withRetries: q.filter((e) => e.attempts > 0).length,
    oldest: q[0]?.createdAt,
    byOp: { insert: q.filter((e) => e.op === "insert").length, update: q.filter((e) => e.op === "update").length, delete: q.filter((e) => e.op === "delete").length },
    byTable: q.reduce<Record<string, number>>((acc, e) => { acc[e.table] = (acc[e.table] || 0) + 1; return acc; }, {}),
  };
}

export function sanitizeMember(member: DbMember): DbMember {
  const secondary = (member.secondary_members || []).map((m: any) => ({
    ...m,
    id: m.id || id(),
    status: m.status || "actif"
  }));
  return {
    ...member,
    secondary_members: secondary,
    guardian: { 
      ...(member.guardian || {}), 
      id: member.guardian?.id || id() 
    },
    total_covered_persons: 1 + secondary.length,
  };
}

async function upsertMemberBundle(client: SupabaseClient, member: DbMember) {
  const { error } = await client.from("members").upsert(sanitizeMember(member), { onConflict: "id" });
  if (error) throw error;
}

async function upsertDeathPromotion(client: SupabaseClient, payload: { updatedDeceased: DbMember; successor?: DbMember | null; death: DbDeath; contributions: DbContribution[] }) {
  const memberRows = [sanitizeMember(payload.updatedDeceased), payload.successor ? sanitizeMember(payload.successor) : null].filter(Boolean) as DbMember[];
  const { error: membersError } = await client.from("members").upsert(memberRows, { onConflict: "id" });
  if (membersError) throw membersError;
  const { error: deathError } = await client.from("deaths").upsert(payload.death, { onConflict: "id" });
  if (deathError) throw deathError;
  if (payload.contributions.length) {
    const { error: contribError } = await client.from("contributions").upsert(payload.contributions, { onConflict: "id" });
    if (contribError) throw contribError;
  }
}

async function flushEntry(client: SupabaseClient, entry: QueueEntry) {
  if (entry.table === "member_bundle") return upsertMemberBundle(client, entry.payload.member);
  if (entry.table === "death_promotion") return upsertDeathPromotion(client, entry.payload);
  
  const table = entry.table as TableName;
  if (entry.op === "delete") {
    const { error } = await client.from(table).delete().eq("id", entry.payload.id);
    if (error) throw error;
    return;
  }

  let payload = entry.payload;
  if (table === "members") {
    payload = sanitizeMember(payload);
  }

  const { error } = await client.from(table).upsert(payload, { onConflict: "id" });
  if (error) throw error;
}

export async function flushQueue(client: SupabaseClient, opts: { force?: boolean } = {}) {
  if (syncing) return { flushed: 0, failed: 0, remaining: getQueue().length };
  if (!opts.force && !isOnline()) return { flushed: 0, failed: 0, remaining: getQueue().length };
  syncing = true;
  let flushed = 0;
  let failed = 0;
  const remaining: QueueEntry[] = [];
  for (const entry of getQueue()) {
    try {
      await flushEntry(client, entry);
      flushed += 1;
      log(entry, "success");
      emit({ type: "item", entry: { ...entry, lastError: undefined }, flushed });
    } catch (err: any) {
      failed += 1;
      const next = { ...entry, attempts: entry.attempts + 1, lastError: err?.message || String(err) };
      remaining.push(next);
      log(next, "failed", next.lastError);
      console.warn(`[sync] item failed (retry ${next.attempts}/∞)`, next.table, next.lastError);
    }
  }
  setQueue(remaining);
  syncing = false;
  emit({ type: "done", flushed, failed, remaining: remaining.length });
  return { flushed, failed, remaining: remaining.length };
}

export function startAutoSync(client: SupabaseClient, intervalMs = 15000) {
  const run = () => { if (isOnline()) flushQueue(client, { force: true }).catch(() => {}); };
  window.addEventListener("online", () => { console.info("[sync] network online -> flushing queue"); run(); });
  window.addEventListener("visibilitychange", () => { if (!document.hidden) run(); });
  window.addEventListener("pageshow", run);
  setInterval(run, intervalMs);
  run();
}

export async function cacheOfflineUser(user: { username: string; role: string; display_name: string }, password: string) {
  const data = new TextEncoder().encode(`${user.username}:${password}:aschrisk`);
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", data))).map((b) => b.toString(16).padStart(2, "0")).join("");
  const all = read<Record<string, any>>(AUTH_KEY, {});
  all[user.username] = { ...user, hash, cachedAt: Date.now() };
  write(AUTH_KEY, all);
}

export async function authenticateOffline(username: string, password: string) {
  const all = read<Record<string, any>>(AUTH_KEY, {});
  const cached = all[username];
  if (!cached) return null;
  const data = new TextEncoder().encode(`${username}:${password}:aschrisk`);
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", data))).map((b) => b.toString(16).padStart(2, "0")).join("");
  return hash === cached.hash ? { id: cached.id || username, username, role: cached.role, display_name: cached.display_name, is_active: true } : null;
}

export function seedDefaultAdmin() {
  return cacheOfflineUser({ username: "admin", role: "super_admin", display_name: "Super Admin" }, "12345678");
}

export type LocalSnapshot = { settings: DbSettings; members: DbMember[]; deaths: DbDeath[]; contributions: DbContribution[]; treasury: DbTreasury };
