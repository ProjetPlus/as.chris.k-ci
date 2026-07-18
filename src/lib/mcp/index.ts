import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listMembers from "./tools/list-members";
import getMember from "./tools/get-member";
import listContributions from "./tools/list-contributions";
import listDeaths from "./tools/list-deaths";
import treasurySummary from "./tools/treasury-summary";

// Direct Supabase issuer (never the .lovable.cloud proxy). Fallback keeps the
// module import-safe during the manifest-extract eval where env is absent.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "aschrisk-mcp",
  title: "AS.CHRIS.K MCP",
  version: "0.1.0",
  instructions:
    "Outils de gestion de l'Association des Chrétiens de Kouassikankro (AS.CHRIS.K). Permet de consulter les membres, ayants droit, personne de tutel, décès, cotisations et trésorerie via l'identité de l'utilisateur connecté.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listMembers, getMember, listContributions, listDeaths, treasurySummary],
});
