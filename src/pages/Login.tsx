import { FormEvent, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Lock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import logo from "@/assets/logo-aschrisk.png";

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    const result = await login(username, password);
    if (result.ok) navigate("/dashboard"); else setError(result.error || "Connexion refusée");
  };
  return <main className="min-h-screen grid md:grid-cols-[1fr_440px] bg-background"><section className="hidden md:flex flex-col justify-center px-16"><img src={logo} alt="AS.CHRIS.K" className="w-40 h-auto mb-8" /><h1 className="text-5xl font-display font-bold text-foreground">AS.CHRIS.K</h1><p className="mt-4 max-w-xl text-lg text-muted-foreground">Gestion rurale offline durable des membres, ayants droit, personnes de tutel, décès, cotisations et cartes.</p></section><section className="flex items-center justify-center p-6"><form onSubmit={submit} className="w-full max-w-sm rounded-lg border bg-card p-6 shadow-elegant"><img src={logo} alt="AS.CHRIS.K" className="w-24 mx-auto mb-4" /><h2 className="text-2xl font-display font-bold text-center">Connexion</h2>{!navigator.onLine && <p className="mt-3 rounded-md bg-destructive-light p-3 text-sm text-destructive">Mode hors ligne. Utilisez un compte déjà ouvert sur cet appareil.</p>}<div className="mt-5 space-y-4"><div><Label>Identifiant</Label><div className="relative mt-1"><User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={username} onChange={(e) => setUsername(e.target.value)} /></div></div><div><Label>Mot de passe</Label><div className="relative mt-1"><Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div></div>{error && <p className="text-sm text-destructive">{error}</p>}<Button className="w-full" type="submit">Entrer</Button></div></form></section></main>;
}
