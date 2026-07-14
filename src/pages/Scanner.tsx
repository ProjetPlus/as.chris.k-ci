import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMembers } from "@/db/useDb";
import { PageTitle } from "@/pages/pageUtils";
import { fullName } from "@/lib/memberWorkflow";

export default function Scanner() {
  const { members } = useMembers();
  const [query, setQuery] = useState("");
  const found = members.find((m) => m.member_id.toLowerCase() === query.toLowerCase() || fullName(m).toLowerCase().includes(query.toLowerCase()));
  return <div><PageTitle title="Scanner QR" subtitle="Recherche manuelle disponible hors ligne" /><section className="rounded-lg border bg-card p-6 text-center"><ScanLine className="mx-auto h-16 w-16 text-primary" /><p className="mt-3 text-muted-foreground">La caméra native reste disponible sur mobile publié. En cas d’échec, saisissez l’identifiant.</p><div className="mt-5 mx-auto flex max-w-lg gap-2"><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="A-26-001" /><Button variant="outline"><Search className="h-4 w-4" /></Button></div>{found && <div className="mt-5 rounded-md border p-4"><p className="font-semibold">{fullName(found)}</p><p className="font-mono text-primary">{found.member_id}</p><Button asChild className="mt-3"><Link to={`/members/${found.id}`}>Ouvrir la fiche</Link></Button></div>}</section></div>;
}
