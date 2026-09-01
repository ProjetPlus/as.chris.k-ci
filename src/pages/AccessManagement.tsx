import { useState } from "react";
import { KeyRound, Shield } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageTitle } from "@/pages/pageUtils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export default function AccessManagement() {
  const { user } = useAuth();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!user) return;
    if (newPassword.length < 8) { toast.error("Le nouveau mot de passe doit contenir au moins 8 caractères."); return; }
    if (newPassword !== confirm) { toast.error("La confirmation ne correspond pas."); return; }
    if (!navigator.onLine) { toast.error("Connexion requise pour changer le mot de passe."); return; }
    setBusy(true);
    try {
      const { error } = await db.rpc("change_app_user_password", {
        p_username: user.username,
        p_old_password: oldPassword,
        p_new_password: newPassword,
      });
      if (error) throw error;
      toast.success("Mot de passe mis à jour.");
      setOldPassword(""); setNewPassword(""); setConfirm("");
    } catch (e: any) {
      toast.error(e?.message === "not authorized" ? "Mot de passe actuel incorrect." : (e?.message || "Échec du changement."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageTitle title="Gestion des accès" subtitle="Authentification par identifiant compatible hors ligne" />

      <section className="rounded-lg border bg-card p-6">
        <Shield className="h-10 w-10 text-primary" />
        <h2 className="mt-3 font-semibold">Comptes applicatifs</h2>
        <p className="mt-2 text-muted-foreground">
          Le compte administrateur local reste disponible après une première ouverture sur l’appareil. Les fonctions de
          création et suppression côté base restent protégées par fonctions dédiées.
        </p>
      </section>

      <section className="rounded-lg border bg-card p-6">
        <KeyRound className="h-8 w-8 text-primary" />
        <h2 className="mt-3 font-semibold">Changer mon mot de passe</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Recommandé : remplacez le mot de passe par défaut du compte administrateur.
        </p>
        <div className="mt-4 grid max-w-md gap-3">
          <Input type="password" autoComplete="current-password" placeholder="Mot de passe actuel" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
          <Input type="password" autoComplete="new-password" placeholder="Nouveau mot de passe (8 caractères min.)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          <Input type="password" autoComplete="new-password" placeholder="Confirmer le nouveau mot de passe" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          <Button onClick={submit} disabled={busy || !user}>{busy ? "Mise à jour…" : "Mettre à jour"}</Button>
        </div>
      </section>
    </div>
  );
}
