import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { OFFICIAL_ASCHRISK_LOGO_URL } from "@/assets/aschriskOfficialLogo";

// Typed wrapper — supabase.auth.oauth is currently beta and may be absent from
// generated types. Cast to a narrow interface so we never grep node_modules.
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: any; error: any }>;
  approveAuthorization: (id: string) => Promise<{ data: any; error: any }>;
  denyAuthorization: (id: string) => Promise<{ data: any; error: any }>;
};
const oauth = () => (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Paramètre authorization_id manquant.");
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/mcp-login?next=" + encodeURIComponent(next);
        return;
      }
      try {
        const { data, error } = await oauth().getAuthorizationDetails(authorizationId);
        if (!active) return;
        if (error) {
          setError(error.message);
          return;
        }
        const immediate = data?.redirect_url ?? data?.redirect_to;
        if (immediate && !data?.client) {
          window.location.href = immediate;
          return;
        }
        setDetails(data);
      } catch (e: any) {
        if (active) setError(e?.message || "Erreur de chargement.");
      }
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    try {
      const api = oauth();
      const { data, error } = approve
        ? await api.approveAuthorization(authorizationId)
        : await api.denyAuthorization(authorizationId);
      if (error) {
        setBusy(false);
        setError(error.message);
        return;
      }
      const target = data?.redirect_url ?? data?.redirect_to;
      if (!target) {
        setBusy(false);
        setError("Le serveur d'autorisation n'a pas renvoyé d'URL de redirection.");
        return;
      }
      window.location.href = target;
    } catch (e: any) {
      setBusy(false);
      setError(e?.message || "Erreur.");
    }
  }

  return (
    <main className="min-h-screen grid place-items-center bg-background p-6">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-elegant">
        <div className="flex items-center gap-3 mb-4">
          <img src={OFFICIAL_ASCHRISK_LOGO_URL} alt="AS.CHRIS.K" className="h-10 w-auto" />
          <div>
            <div className="text-sm text-muted-foreground">AS.CHRIS.K</div>
            <div className="font-display font-bold text-lg">Autorisation d'accès</div>
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-destructive-light p-3 text-sm text-destructive">{error}</div>
        )}

        {!details && !error && <p className="text-sm text-muted-foreground">Chargement…</p>}

        {details && (
          <>
            <h1 className="text-xl font-bold mb-2">
              Connecter {details.client?.name ?? "cette application"} à votre compte
            </h1>
            <p className="text-sm text-muted-foreground mb-4">
              {details.client?.name ?? "Le client"} pourra appeler les outils AS.CHRIS.K en votre nom
              (membres, ayants droit, tutel, décès, cotisations, trésorerie). Les règles de
              permissions et RLS de l'application restent appliquées.
            </p>
            {details.client?.redirect_uri && (
              <p className="text-xs text-muted-foreground mb-4 break-all">
                Redirection : {details.client.redirect_uri}
              </p>
            )}
            <div className="flex gap-3">
              <Button className="flex-1" disabled={busy} onClick={() => decide(true)}>
                Approuver
              </Button>
              <Button variant="outline" className="flex-1" disabled={busy} onClick={() => decide(false)}>
                Refuser
              </Button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
