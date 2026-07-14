import { describe, expect, it } from "vitest";
import { buildDeathPromotionBundle, DEFAULT_SETTINGS, makeMember } from "@/lib/memberWorkflow";

describe("promotion du tutel au décès", () => {
  it("crée un successeur avec les ayants droit actifs et les cotisations", () => {
    const principal = makeMember({
      first_name: "Narcisse",
      last_name: "Kouadio",
      phone: "+225 0101010101",
      campement: "Kouassikankro",
      sous_prefecture: "Bocanda",
      id_type: "CNI",
      secondary_members: [
        { id: "s1", first_name: "Aya", last_name: "Kouadio", relationship: "Enfant", status: "actif" },
        { id: "s2", first_name: "Koffi", last_name: "Kouadio", relationship: "Enfant", status: "décédé" },
      ],
      guardian: { first_name: "Ahou", last_name: "Kouadio", phone: "+225 0202020202", relationship: "Tutel" },
    }, [], DEFAULT_SETTINGS);
    const other = makeMember({ first_name: "Jean", last_name: "Nguessan", phone: "+225 0303030303", campement: "Zone", sous_prefecture: "SP", id_type: "CNI" }, [principal], DEFAULT_SETTINGS);

    const bundle = buildDeathPromotionBundle(principal, [principal, other], DEFAULT_SETTINGS, "2026-07-14");

    expect(bundle.updatedDeceased.status).toBe("décédé");
    expect(bundle.updatedDeceased.principal_successor_member_id).toBe(bundle.successor?.id);
    expect(bundle.successor?.previous_principal_member_id).toBe(principal.id);
    expect(bundle.successor?.secondary_members).toHaveLength(1);
    expect(bundle.successor?.secondary_members[0].id).toBe("s1");
    expect(bundle.successor?.total_covered_persons).toBe(2);
    expect(bundle.death.successor_member_id).toBe(bundle.successor?.id);
    expect(bundle.death.deceased_member_uuid).toBe(principal.id);
    expect(bundle.death.total_expected_contributions).toBe(2 * DEFAULT_SETTINGS.contribution_amount);
    expect(bundle.contributions).toHaveLength(2);
    expect(bundle.contributions.every((c) => c.expected_amount === DEFAULT_SETTINGS.contribution_amount)).toBe(true);
    expect(bundle.contributions.map((c) => c.member_uuid)).toEqual([other.id, bundle.successor?.id]);
  });
});
