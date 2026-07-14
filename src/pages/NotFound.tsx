import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return <main className="min-h-screen grid place-items-center p-6"><div className="text-center"><h1 className="text-4xl font-display font-bold">Page introuvable</h1><Button asChild className="mt-4"><Link to="/dashboard">Retour</Link></Button></div></main>;
}
