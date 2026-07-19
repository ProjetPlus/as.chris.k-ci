import type { CoveredPerson, DbContribution, DbDeath, DbMember, DbSettings, GuardianPerson } from "@/db/database";

export const today = () => new Date().toISOString().slice(0, 10);
export const nowIso = () => new Date().toISOString();
export const uuid = () => (crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

export const DEFAULT_SETTINGS: DbSettings = {
  id: "settings-default",
  association_name: "Association des Chrétiens de Kouassikankro (AS.CHRIS.K)",
  initials: "A",
  phone: "+225 0102806057",
  contribution_amount: 1000,
  adhesion_fee: 10000,
  principal_payout: 300000,
  secondary_payout: 250000,
  secondary_retained: 50000,
  created_at: nowIso(),
  updated_at: nowIso(),
};

export function formatCurrency(amount: number | string | null | undefined) {
  const value = Number(amount || 0);
  return `${new Intl.NumberFormat("fr-FR").format(value)} FCFA`;
}

export function fullName(person: Pick<DbMember, "first_name" | "last_name"> | Partial<CoveredPerson> | Partial<GuardianPerson>) {
  return `${person.last_name || ""} ${person.first_name || ""}`.trim() || "Nom non renseigné";
}

export function normalizePhone(value = "") {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "+225 ";
  const withoutCi = digits.startsWith("225") ? digits.slice(3) : digits;
  return `+225 ${withoutCi.replace(/(.{2})/g, "$1 ").trim()}`.trim();
}

export function nextMemberId(members: Pick<DbMember, "member_id">[], initials = "A") {
  const yy = String(new Date().getFullYear()).slice(-2);
  const prefix = `${initials || "A"}-${yy}-`;
  const max = members.reduce((n, m) => {
    if (!m.member_id?.startsWith(prefix)) return n;
    const parsed = Number(m.member_id.slice(prefix.length));
    return Number.isFinite(parsed) ? Math.max(n, parsed) : n;
  }, 0);
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

export function makeMember(input: Partial<DbMember>, existing: DbMember[], settings: DbSettings): DbMember {
  const secondary = (input.secondary_members || []).map((p) => ({ ...p, id: p.id || uuid(), status: p.status || "actif" as const }));
  const at = nowIso();
  return {
    id: input.id || uuid(),
    member_id: input.member_id || nextMemberId(existing, settings.initials),
    first_name: input.first_name || "",
    last_name: input.last_name || "",
    phone: normalizePhone(input.phone),
    phone_secondary: input.phone_secondary ? normalizePhone(input.phone_secondary) : "",
    whatsapp: input.whatsapp ? normalizePhone(input.whatsapp) : "",
    campement: input.campement || "",
    sous_prefecture: input.sous_prefecture || "",
    id_type: input.id_type || "",
    id_number: input.id_number || "",
    photo: input.photo || "",
    id_card_front: input.id_card_front || "",
    registration_date: input.registration_date || today(),
    status: input.status || "actif",
    adhesion_paid: Boolean(input.adhesion_paid),
    adhesion_amount: Number(input.adhesion_amount ?? settings.adhesion_fee),
    adhesion_payment_method: input.adhesion_payment_method || "especes",
    adhesion_payment_date: input.adhesion_payment_date || (input.adhesion_paid ? today() : ""),
    adhesion_proof_type: input.adhesion_proof_type || "",
    adhesion_proof_data: input.adhesion_proof_data || "",
    adhesion_transaction_id: input.adhesion_transaction_id || "",
    secondary_members: secondary,
    guardian: { ...(input.guardian || {}), id: input.guardian?.id || uuid() },
    total_covered_persons: 1 + secondary.length,
    contribution_status: input.contribution_status || "à_jour",
    previous_principal_member_id: input.previous_principal_member_id,
    principal_successor_member_id: input.principal_successor_member_id,
    created_at: input.created_at || at,
    updated_at: at,
  };
}

export function createSuccessorFromGuardian(deceased: DbMember, existing: DbMember[], settings: DbSettings): DbMember | null {
  const g = deceased.guardian || {};
  if (!g.first_name && !g.last_name && !g.phone) return null;
  return makeMember({
    first_name: g.first_name || deceased.first_name,
    last_name: g.last_name || deceased.last_name,
    phone: g.phone || deceased.phone,
    campement: g.campement || deceased.campement,
    sous_prefecture: g.sous_prefecture || deceased.sous_prefecture,
    id_type: g.id_type || "Tutel",
    id_number: g.id_number || "",
    status: "actif",
    adhesion_paid: true,
    adhesion_amount: 0,
    adhesion_payment_method: "especes",
    adhesion_payment_date: today(),
    secondary_members: deceased.secondary_members.filter((p) => p.status !== "décédé"),
    guardian: {},
    previous_principal_member_id: deceased.id,
  }, existing, settings);
}

export function buildDeathPromotionBundle(deceased: DbMember, members: DbMember[], settings: DbSettings, dateOfDeath = today()) {
  const successor = createSuccessorFromGuardian(deceased, members, settings);
  const updatedDeceased: DbMember = {
    ...deceased,
    status: "décédé",
    principal_successor_member_id: successor?.id,
    secondary_members: deceased.secondary_members.map((p) => ({ ...p, status: p.status || "actif" })),
    updated_at: nowIso(),
  };
  const activeMembers = members.filter((m) => m.status === "actif" && m.id !== deceased.id);
  const payers = successor ? [...activeMembers, successor] : activeMembers;
  const death: DbDeath = {
    id: uuid(),
    deceased_name: fullName(deceased),
    deceased_member_id: deceased.member_id,
    deceased_member_uuid: deceased.id,
    date_of_death: dateOfDeath,
    type: "principal",
    payout: settings.principal_payout,
    retained: 0,
    total_expected_contributions: payers.length * settings.contribution_amount,
    total_collected: 0,
    status: "en_cours",
    successor_member_id: successor?.id,
    created_at: nowIso(),
  };
  const contributions: DbContribution[] = payers.map((m) => ({
    id: uuid(),
    member_id: m.member_id,
    member_uuid: m.id,
    member_name: fullName(m),
    death_id: death.id,
    amount: 0,
    expected_amount: settings.contribution_amount,
    payment_method: "especes",
    status: "non_payé",
    created_at: nowIso(),
  }));
  return { updatedDeceased, successor, death, contributions };
}
