import { FormEvent, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OFFICIAL_ASCHRISK_LOGO_URL } from "@/assets/aschriskOfficialLogo";

/**
 * Supabase Auth login dedicated to the MCP OAuth consent flow.
 * Preserves `?next=` through email/password AND Google so the user returns
 * to /.lovable/oauth/consent?authorization_id=... after signing in.
 */
export default function McpLogin() {
  const [params] = useSearchParams();
  const nextRaw = params.get("next") || "/.lovable/oauth/consent";
  const next = nextRaw.startsWith("/") ? nextRaw : "/.lovable/oauth/consent";
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setError(error.message);
          setBusy(false);
          return;
        }
        window.location.href = next;
      } else {
        const emailRedirectTo = `${window.location.origin}${next}`;
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo },
        });
        if (error) {
          setError(error.message);
          setBusy(false);
          return;
        }
        // If email confirmation is disabled the user is signed in immediately.
        const { data } = await supabase.auth.getSession();
        if (data.session) window.location.href = next;
        else setError("Vérifiez votre email pour confirmer votre inscription.");
        setBusy(false);
      }
    } catch (e: any) {
      setError(e?.message || "Erreur.");
      setBusy(false);
    }
  }

  async function google() {
    setError(null);
    setBusy(true);
    try {
      const redirect_uri = `${window.location.origin}${next}`;
      const result = await lovable.auth.signInWithOAuth("google", { redirect_uri });
      if (result.error) {
        setError(result.error.message || "Connexion Google impossible.");
        setBusy(false);
        return;
      }
      if (result.redirected) return;
      window.location.href = next;
    } catch (e: any) {
      setError(e?.message || "Erreur Google.");
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen grid place-items-center bg-background p-6">
      <form onSubmit={submit} className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-elegant">
        <div className="flex flex-col items-center mb-4">
          <img src={OFFICIAL_ASCHRISK_LOGO_URL} alt="AS.CHRIS.K" className="h-14 w-auto mb-2" />
          <h1 className="text-xl font-display font-bold">Connexion pour intégrations</h1>
          <p className="text-xs text-muted-foreground mt-1 text-center">
            Utilisé pour autoriser ChatGPT, Claude, Cursor ou tout autre client MCP à accéder aux
            données AS.CHRIS.K en votre nom.
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <Label>Email</Label>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label>Mot de passe</Label>
            <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy}>
            {mode === "signin" ? "Se connecter" : "Créer un compte"}
          </Button>
          <Button type="button" variant="outline" className="w-full" disabled={busy} onClick={google}>
            Continuer avec Google
          </Button>
          <button
            type="button"
            className="w-full text-xs text-muted-foreground underline"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          >
            {mode === "signin" ? "Créer un compte" : "J'ai déjà un compte"}
          </button>
        </div>
      </form>
    </main>
  );
}
