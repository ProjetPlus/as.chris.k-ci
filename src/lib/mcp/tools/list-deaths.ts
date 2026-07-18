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
  name: "list_deaths",
  title: "Lister les décès",
  description: "Retourne les décès enregistrés (principal ou secondaire) avec montant reversé, retenu et statut.",
  inputSchema: {
    status: z.enum(["en_cours", "clôturé"]).optional(),
    type: z.enum(["principal", "secondaire"]).optional(),
    limit: z.number().int().min(1).max(200).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, type, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Non authentifié." }], isError: true };
    const supabase = supabaseForUser(ctx);
    let q = supabase.from("deaths").select("*").order("date_of_death", { ascending: false }).limit(limit ?? 50);
    if (status) q = q.eq("status", status);
    if (type) q = q.eq("type", type);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `${data?.length ?? 0} décès enregistré(s).` }],
      structuredContent: { deaths: data ?? [] },
    };
  },
});
