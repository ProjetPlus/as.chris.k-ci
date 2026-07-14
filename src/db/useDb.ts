import { useEffect, useMemo, useState } from "react";
import type { AppUser, DbContribution, DbDeath, DbMember, DbSettings, DbTreasury, TableName } from "@/db/database";
import { supabase } from "@/integrations/supabase/client";
import { enqueue, enqueueDeathPromotion, enqueueMemberBundle, flushQueue } from "@/lib/offline";
import { DEFAULT_SETTINGS, buildDeathPromotionBundle, fullName, makeMember, nowIso, uuid } from "@/lib/memberWorkflow";

const SNAPSHOT_KEY = "aschrisk.db.snapshot.v5";
const CREATE_MEMBER_EVENT = "aschrisk:create-member";

type Snapshot = { settings: DbSettings; members: DbMember[]; deaths: DbDeath[]; contributions: DbContribution[]; treasury: DbTreasury; users: AppUser[] };

const emptyTreasury: DbTreasury = { id: "treasury-local", total_balance: 0, total_contributions_collected: 0, total_payouts: 0, retained_reserves: 0, pending_contributions: 0, updated_at: nowIso() };
const initial: Snapshot = { settings: DEFAULT_SETTINGS, members: [], deaths: [], contributions: [], treasury: emptyTreasury, users: [] };

function readSnapshot(): Snapshot {
  try { return { ...initial, ...JSON.parse(localStorage.getItem(SNAPSHOT_KEY) || "{}") }; } catch { return initial; }
}

function writeSnapshot(next: Snapshot) {
  localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("aschrisk:db"));
}

const sanitizeArray = <T,>(value: T[] | null | undefined): T[] => Array.isArray(value) ? value : [];
const sanitizeGuardian = (value: DbMember["guardian"] | null | undefined): DbMember["guardian"] => value || {};

function normalizeMemberRow(member: DbMember): DbMember {
  const secondary = sanitizeArray(member.secondary_members).map((p) => ({ ...p, id: p.id || uuid(), status: p.status || "actif" as const }));
  return {
    ...member,
    secondary_members: secondary,
    guardian: sanitizeGuardian(member.guardian),
    total_covered_persons: 1 + secondary.length,
    adhesion_amount: Number(member.adhesion_amount || DEFAULT_SETTINGS.adhesion_fee),
    contribution_status: member.contribution_status || "à_jour",
  };
}

function patchSnapshot(mutator: (snap: Snapshot) => Snapshot) {
  const next = mutator(readSnapshot());
  writeSnapshot(next);
  return next;
}

function recalcTreasury(snap: Snapshot): DbTreasury {
  const adhesions = snap.members.filter((m) => m.adhesion_paid).reduce((s, m) => s + Number(m.adhesion_amount || snap.settings.adhesion_fee), 0);
  const collected = snap.contributions.filter((c) => c.status === "payé" || c.status === "partiel").reduce((s, c) => s + Number(c.amount || 0), 0);
  const payouts = snap.deaths.reduce((s, d) => s + Number(d.payout || 0), 0);
  const retained = snap.deaths.reduce((s, d) => s + Number(d.retained || 0), 0);
  const pending = snap.contributions.filter((c) => c.status === "non_payé" || c.status === "partiel").reduce((s, c) => s + Math.max(Number(c.expected_amount || 0) - Number(c.amount || 0), 0), 0);
  return { id: snap.treasury.id || "treasury-local", total_balance: adhesions + collected - payouts + retained, total_contributions_collected: adhesions + collected, total_payouts: payouts, retained_reserves: retained, pending_contributions: pending, updated_at: nowIso() };
}

async function safeFetch<T>(table: TableName, fallback: T[]): Promise<T[]> {
  if (!navigator.onLine) return fallback;
  const { data, error } = await supabase.from(table).select("*");
  return error || !data ? fallback : data as T[];
}

export async function refreshFromServer() {
  const snap = readSnapshot();
  const [settingsRows, members, deaths, contributions, treasuryRows] = await Promise.all([
    safeFetch<DbSettings>("settings", [snap.settings]),
    safeFetch<DbMember>("members", snap.members),
    safeFetch<DbDeath>("deaths", snap.deaths),
    safeFetch<DbContribution>("contributions", snap.contributions),
    safeFetch<DbTreasury>("treasury", [snap.treasury]),
  ]);
  const normalizedMembers = members.map(normalizeMemberRow);
  const next = { ...snap, settings: settingsRows[0] || snap.settings, members: normalizedMembers, deaths, contributions, treasury: treasuryRows[0] || recalcTreasury({ ...snap, members: normalizedMembers, deaths, contributions }) };
  writeSnapshot(next);
  return next;
}

function useSnapshot() {
  const [snap, setSnap] = useState(readSnapshot);
  useEffect(() => {
    const refresh = () => setSnap(readSnapshot());
    window.addEventListener("aschrisk:db", refresh);
    window.addEventListener("online", () => { refreshFromServer().then(() => flushQueue(supabase, { force: true })).catch(() => {}); });
    refreshFromServer().catch(() => {});
    return () => window.removeEventListener("aschrisk:db", refresh);
  }, []);
  return snap;
}

async function persist(table: TableName, payload: any, op: "insert" | "update" | "delete" = "update") {
  if (!navigator.onLine) {
    enqueue({ op: op === "delete" ? "delete" : "update", table, payload });
    return;
  }
  if (op === "delete") {
    const { error } = await supabase.from(table).delete().eq("id", payload.id);
    if (error) enqueue({ op: "delete", table, payload });
    return;
  }
  const { error } = await supabase.from(table).upsert(payload, { onConflict: "id" });
  if (error) enqueue({ op: "update", table, payload });
}

export function createMemberOfflineFirst(input: Partial<DbMember>) {
  const current = readSnapshot();
  const member = normalizeMemberRow(makeMember(input, current.members, current.settings));
  patchSnapshot((s) => ({ ...s, members: [member, ...s.members], treasury: recalcTreasury({ ...s, members: [member, ...s.members] }) }));
  enqueueMemberBundle(member);
  if (navigator.onLine) flushQueue(supabase, { force: true }).catch(() => {});
  window.dispatchEvent(new CustomEvent(CREATE_MEMBER_EVENT, { detail: member }));
  return member;
}

export function useSettings() {
  const snap = useSnapshot();
  const updateSettings = async (patch: Partial<DbSettings>) => {
    const settings = { ...readSnapshot().settings, ...patch, updated_at: nowIso() };
    patchSnapshot((s) => ({ ...s, settings }));
    await persist("settings", settings);
  };
  return { settings: snap.settings, updateSettings };
}

export function useMembers() {
  const snap = useSnapshot();
  const createMember = async (input: Partial<DbMember>) => {
    const member = normalizeMemberRow(makeMember(input, readSnapshot().members, readSnapshot().settings));
    patchSnapshot((s) => ({ ...s, members: [member, ...s.members], treasury: recalcTreasury({ ...s, members: [member, ...s.members] }) }));
    enqueueMemberBundle(member);
    if (navigator.onLine) await flushQueue(supabase, { force: true });
    return member;
  };
  const updateMember = async (id: string, patch: Partial<DbMember>) => {
    let member: DbMember | undefined;
    patchSnapshot((s) => {
      const members = s.members.map((m) => m.id === id ? (member = normalizeMemberRow(makeMember({ ...m, ...patch, id: m.id, member_id: m.member_id, created_at: m.created_at }, s.members, s.settings)))! : m);
      return { ...s, members, treasury: recalcTreasury({ ...s, members }) };
    });
    if (member) {
      enqueueMemberBundle(member);
      if (navigator.onLine) await flushQueue(supabase, { force: true });
    }
    return member;
  };
  const deleteMember = async (id: string) => {
    patchSnapshot((s) => ({ ...s, members: s.members.filter((m) => m.id !== id) }));
    await persist("members", { id }, "delete");
  };
  return { members: snap.members, createMember, updateMember, deleteMember, getMember: (id: string) => snap.members.find((m) => m.id === id || m.member_id === id) };
}

export function useDeaths() {
  const snap = useSnapshot();
  const registerPrincipalDeath = async (memberId: string, dateOfDeath: string) => {
    const s = readSnapshot();
    const deceased = s.members.find((m) => m.id === memberId || m.member_id === memberId);
    if (!deceased) throw new Error("Membre introuvable");
    const bundle = buildDeathPromotionBundle(deceased, s.members, s.settings, dateOfDeath);
    patchSnapshot((old) => {
      const members = [bundle.updatedDeceased, ...(bundle.successor ? [bundle.successor] : []), ...old.members.filter((m) => m.id !== bundle.updatedDeceased.id)];
      const deaths = [bundle.death, ...old.deaths];
      const contributions = [...bundle.contributions, ...old.contributions];
      return { ...old, members, deaths, contributions, treasury: recalcTreasury({ ...old, members, deaths, contributions }) };
    });
    if (!navigator.onLine) enqueueDeathPromotion(bundle); else {
      await persist("members", bundle.updatedDeceased);
      if (bundle.successor) await persist("members", bundle.successor);
      await persist("deaths", bundle.death);
      for (const c of bundle.contributions) await persist("contributions", c);
    }
    return bundle;
  };
  return { deaths: snap.deaths, registerPrincipalDeath };
}

export function useContributions() {
  const snap = useSnapshot();
  const updateContribution = async (id: string, patch: Partial<DbContribution>) => {
    let contribution: DbContribution | undefined;
    patchSnapshot((s) => {
      const contributions = s.contributions.map((c) => c.id === id ? (contribution = { ...c, ...patch })! : c);
      return { ...s, contributions, treasury: recalcTreasury({ ...s, contributions }) };
    });
    if (contribution) await persist("contributions", contribution);
  };
  return { contributions: snap.contributions, updateContribution };
}

export function useTreasury() { return { treasury: useSnapshot().treasury }; }

export function useDashboardData() {
  const snap = useSnapshot();
  return useMemo(() => ({
    ...snap,
    activeMembers: snap.members.filter((m) => m.status === "actif"),
    lateMembers: snap.members.filter((m) => m.contribution_status === "en_retard"),
    coveredPersons: snap.members.reduce((s, m) => s + Number(m.total_covered_persons || 1), 0),
  }), [snap]);
}

export function useReportsData() { return useSnapshot(); }

export function makeManualContribution(member: DbMember, death: DbDeath, amount: number): DbContribution {
  return { id: uuid(), member_id: member.member_id, member_uuid: member.id, member_name: fullName(member), death_id: death.id, amount, expected_amount: amount, payment_method: "especes", status: amount > 0 ? "payé" : "non_payé", date: amount > 0 ? new Date().toISOString().slice(0, 10) : undefined, created_at: nowIso() };
}
