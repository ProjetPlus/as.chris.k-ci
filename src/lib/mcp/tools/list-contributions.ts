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
  name: "list_contributions",
  title: "Lister les cotisations",
  description: "Retourne les cotisations enregistrées. Filtrable par statut et par décès (death_id) ou membre (member_id).",
  inputSchema: {
    status: z.enum(["payé", "non_payé", "partiel", "exonéré"]).optional(),
    death_id: z.string().optional(),
    member_id: z.string().optional(),
    limit: z.number().int().min(1).max(500).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, death_id, member_id, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Non authentifié." }], isError: true };
    const supabase = supabaseForUser(ctx);
    let q = supabase.from("contributions").select("*").order("created_at", { ascending: false }).limit(limit ?? 100);
    if (status) q = q.eq("status", status);
    if (death_id) q = q.eq("death_id", death_id);
    if (member_id) q = q.eq("member_id", member_id);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `${data?.length ?? 0} cotisation(s).` }],
      structuredContent: { contributions: data ?? [] },
    };
  },
});
