import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_members",
  title: "Lister les membres",
  description:
    "Retourne la liste des membres AS.CHRIS.K (nom, prénom, identifiant, campement, téléphone, statut). Filtres optionnels sur statut et campement, recherche par nom.",
  inputSchema: {
    search: z.string().optional().describe("Recherche libre sur nom/prénom/identifiant."),
    status: z.enum(["actif", "suspendu", "décédé"]).optional(),
    campement: z.string().optional(),
    limit: z.number().int().min(1).max(200).optional().describe("Nombre max de résultats (défaut 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, status, campement, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Non authentifié." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("members")
      .select("id, member_id, first_name, last_name, phone, campement, status, adhesion_paid, contribution_status, total_covered_persons, registration_date")
      .order("last_name", { ascending: true })
      .limit(limit ?? 50);
    if (status) q = q.eq("status", status);
    if (campement) q = q.ilike("campement", `%${campement}%`);
    if (search) q = q.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,member_id.ilike.%${search}%`);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `${data?.length ?? 0} membre(s) trouvé(s).` }],
      structuredContent: { members: data ?? [] },
    };
  },
});
