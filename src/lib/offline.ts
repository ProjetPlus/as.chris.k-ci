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
export type SyncLogEntry = {
  id: string;
  ts: number;
  op: QueueOp;
  table: string;
  status: "pending" | "success" | "failed" | "dropped";
  error?: string;
  details?: string;
  attempts?: number;
  payloadSummary?: Record<string, unknown>;
};
export type SyncEvent = { type: "item"; entry: QueueEntry; flushed: number } | { type: "done"; flushed: number; failed: number; remaining: number };

const QUEUE_KEY = "aschrisk.sync.queue.v3";
const LOG_KEY = "aschrisk.sync.log.v1";
const LAST_SYNC_KEY = "aschrisk.sync.last_success.v1";
const LAST_SYNC_ATTEMPT_KEY = "aschrisk.sync.last_attempt.v1";
const AUTH_KEY = "aschrisk.offline.auth.v2";
const MAX_LOG = 250;
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
export function getLastSuccessfulSync() { return read<number | null>(LAST_SYNC_KEY, null); }
export function getLastSyncAttempt() { return read<number | null>(LAST_SYNC_ATTEMPT_KEY, null); }
export function onSyncEvent(cb: (e: SyncEvent) => void) { listeners.add(cb); return () => listeners.delete(cb); }
const emit = (e: SyncEvent) => listeners.forEach((cb) => cb(e));

function summarizePayload(payload: any): Record<string, unknown> {
  const member = payload?.member || payload?.updatedDeceased || payload;
  if (payload?.death && payload?.contributions) {
    return {
      death_id: payload.death.id,
      deceased_member_id: payload.death.deceased_member_id,
      successor_member_id: payload.successor?.member_id || payload.successor?.id || "aucun",
      ayants_droit: payload.successor?.secondary_members?.length ?? payload.updatedDeceased?.secondary_members?.length ?? 0,
      cotisations: payload.contributions.length,
    };
  }
  if (member && typeof member === "object") {
    const secondary = Array.isArray(member.secondary_members) ? member.secondary_members : [];
    return {
      id: member.id,
      member_id: member.member_id,
      nom: [member.last_name, member.first_name].filter(Boolean).join(" ") || member.member_name,
      ayants_droit: secondary.length,
      tutel: [member.guardian?.last_name, member.guardian?.first_name].filter(Boolean).join(" ") || (member.guardian?.phone ? "tutel avec téléphone" : "aucun"),
      montant_adhesion: member.adhesion_amount,
      statut: member.status,
    };
  }
  return { valeur: typeof payload };
}

function describePayload(entry: QueueEntry) {
  const s = summarizePayload(entry.payload);
  if (entry.table === "death_promotion") return `Décès ${s.deceased_member_id || "—"} · successeur ${s.successor_member_id || "—"} · ayants droit ${s.ayants_droit} · cotisations ${s.cotisations}`;
  if (entry.table === "member_bundle" || entry.table === "members") return `Membre ${s.member_id || s.id || "—"} · ayants droit ${s.ayants_droit} · tutel ${s.tutel}`;
  if (entry.table === "contributions") return `Cotisation ${s.id || "—"} · ${s.member_id || "—"}`;
  if (entry.table === "deaths") return `Décès ${s.id || "—"}`;
  return `${entry.table} ${s.id || ""}`.trim();
}

const log = (entry: QueueEntry, status: SyncLogEntry["status"], error?: string) => {
  const row: SyncLogEntry = {
    id: entry.id,
    ts: Date.now(),
    op: entry.op,
    table: entry.table,
    status,
    error,
    details: describePayload(entry),
    attempts: entry.attempts,
    payloadSummary: summarizePayload(entry.payload),
  };
  write(LOG_KEY, [row, ...getSyncLog()].slice(0, MAX_LOG));
  return row;
};

async function writeBaseAudit(client: SupabaseClient, entry: QueueEntry, status: SyncLogEntry["status"], error?: string) {
  if (!isOnline()) return;
  try {
    await client.from("sync_audit_logs").insert({
      queue_id: entry.id,
      operation: entry.op,
      target_table: entry.table,
      status,
      attempts: entry.attempts,
      details: describePayload(entry),
      error_message: error || null,
      payload_summary: summarizePayload(entry.payload),
      created_at: new Date().toISOString(),
    });
  } catch {
    // Audit base is diagnostic only: never block rural offline sync because logging failed.
  }
}

function normalizePayloadForQueue(table: QueueEntry["table"], payload: any) {
  if (table === "members") return sanitizeMember(payload);
  if (table === "member_bundle") return { ...payload, member: sanitizeMember(payload.member) };
  if (table === "death_promotion") {
    return {
      ...payload,
      updatedDeceased: sanitizeMember(payload.updatedDeceased),
      successor: payload.successor ? sanitizeMember(payload.successor) : payload.successor,
      contributions: Array.isArray(payload.contributions) ? payload.contributions : [],
    };
  }
  return payload;
}

export function enqueue(entry: Omit<QueueEntry, "id" | "createdAt" | "attempts"> & Partial<Pick<QueueEntry, "id" | "attempts">>) {
  const q = getQueue();
  const item: QueueEntry = { id: entry.id || id(), createdAt: Date.now(), attempts: entry.attempts || 0, op: entry.op, table: entry.table, payload: normalizePayloadForQueue(entry.table, entry.payload), status: "pending" };
  q.push(item);
  setQueue(q);
  log(item, "pending");
  console.info("[sync] opération mise en file", item.table, describePayload(item));
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
    byOp: { insert: q.filter((e) => e.op === "insert").length, update: q.filter((e) => e.op === "update").length, delete: q.filter((e) => e.op === "delete").length, batch: q.filter((e) => e.op === "batch").length },
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

// Priority order guarantees relational integrity: parent member rows and
// bundles (which carry ayants droit + guardian) sync BEFORE dependent
// contributions / deaths. Within a priority band, FIFO by createdAt.
const TABLE_PRIORITY: Record<string, number> = {
  members: 0,
  member_bundle: 0,
  death_promotion: 1,
  deaths: 2,
  contributions: 3,
  treasury: 4,
  settings: 4,
  app_users: 4,
};
const priorityOf = (t: string) => TABLE_PRIORITY[t] ?? 5;

// Exponential backoff (cap 10 min). Skipped entries stay in queue for a later tick.
function nextAttemptAt(entry: QueueEntry) {
  if (!entry.attempts) return 0;
  const base = Math.min(600_000, 2000 * Math.pow(2, entry.attempts - 1));
  const anchor = (entry as any).lastAttemptAt || entry.createdAt;
  return anchor + base;
}

export async function flushQueue(client: SupabaseClient, opts: { force?: boolean } = {}) {
  if (syncing) return { flushed: 0, failed: 0, remaining: getQueue().length };
  if (!opts.force && !isOnline()) return { flushed: 0, failed: 0, remaining: getQueue().length };
  syncing = true;
  let flushed = 0;
  let failed = 0;
  const now = Date.now();
  const remaining: QueueEntry[] = [];
  write(LAST_SYNC_ATTEMPT_KEY, now);
  try {
    // Sort a snapshot by priority, then FIFO; entries with pending backoff are deferred.
    const snapshot = [...getQueue()].sort((a, b) => priorityOf(a.table) - priorityOf(b.table) || a.createdAt - b.createdAt);
    for (const entry of snapshot) {
      if (nextAttemptAt(entry) > now && !opts.force) {
        remaining.push(entry);
        continue;
      }
      const normalized = { ...entry, payload: normalizePayloadForQueue(entry.table, entry.payload) };
      try {
        await flushEntry(client, normalized);
        flushed += 1;
        const done: QueueEntry = { ...normalized, status: "success", lastError: undefined };
        log(done, "success");
        await writeBaseAudit(client, done, "success");
        emit({ type: "item", entry: done, flushed });
      } catch (err: any) {
        failed += 1;
        const next: QueueEntry = { ...normalized, attempts: normalized.attempts + 1, lastError: err?.message || String(err), status: "failed" };
        (next as any).lastAttemptAt = Date.now();
        remaining.push(next);
        log(next, "failed", next.lastError);
        await writeBaseAudit(client, next, "failed", next.lastError);
        emit({ type: "item", entry: next, flushed });
        console.warn(`[sync] échec item (retry ${next.attempts}/∞ backoff)`, next.table, describePayload(next), next.lastError);
      }
    }
    setQueue(remaining);
    if (flushed > 0 && failed === 0) write(LAST_SYNC_KEY, Date.now());
    return { flushed, failed, remaining: remaining.length };
  } finally {
    syncing = false;
    emit({ type: "done", flushed, failed, remaining: remaining.length });
  }
}


export function startAutoSync(client: SupabaseClient, intervalMs = 15000) {
  const run = () => { if (isOnline()) flushQueue(client, { force: true }).catch(() => {}); };
  window.addEventListener("online", () => { console.info("[sync] network online -> flushing queue"); run(); });
  window.addEventListener("visibilitychange", () => { if (!document.hidden) run(); });
  window.addEventListener("focus", run);
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
