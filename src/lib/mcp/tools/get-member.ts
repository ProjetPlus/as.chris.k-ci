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
  name: "get_member",
  title: "Détail d'un membre",
  description:
    "Retourne le dossier complet d'un membre : identité, coordonnées, ayants droit (secondary_members), personne de tutel (guardian), statut de cotisation et adhésion.",
  inputSchema: {
    member_id: z.string().min(1).describe("Identifiant lisible (ex: A-25-0007) ou UUID interne."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ member_id }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Non authentifié." }], isError: true };
    const supabase = supabaseForUser(ctx);
    const isUuid = /^[0-9a-f-]{36}$/i.test(member_id);
    const { data, error } = await supabase
      .from("members")
      .select("*")
      .or(isUuid ? `id.eq.${member_id}` : `member_id.eq.${member_id}`)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: "Membre introuvable." }], isError: true };
    return {
      content: [{ type: "text", text: `Membre ${data.member_id} — ${data.last_name} ${data.first_name}` }],
      structuredContent: { member: data },
    };
  },
});
