import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, ShieldCheck, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Routes/écrans critiques que l'app doit pouvoir afficher hors ligne.
const ROUTES = [
  "/",
  "/dashboard",
  "/login",
  "/members",
  "/deaths",
  "/contributions",
  "/cards",
  "/reports",
  "/sync",
  "/settings",
];

type Row = { url: string; cached: boolean };

async function checkOfflineReadiness(): Promise<Row[]> {
  if (!("caches" in window)) return ROUTES.map((r) => ({ url: r, cached: false }));
  const names = await caches.keys();
  const cachesArr = await Promise.all(names.map((n) => caches.open(n)));
  const results: Row[] = [];
  for (const r of ROUTES) {
    let cached = false;
    for (const c of cachesArr) {
      const m = await c.match(r, { ignoreSearch: true }) || await c.match("/index.html");
      if (m) { cached = true; break; }
    }
    results.push({ url: r, cached });
  }
  return results;
}

export function PrecacheCheck() {
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const run = async () => { setBusy(true); try { setRows(await checkOfflineReadiness()); } finally { setBusy(false); } };
  useEffect(() => { run(); }, []);

  const okCount = rows.filter((r) => r.cached).length;

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-4 w-4 text-accent" /> Vérification du pré-cache ({okCount}/{rows.length})
        </CardTitle>
        <Button size="sm" variant="outline" onClick={run} disabled={busy}>
          <RefreshCw className={`mr-1 h-3 w-3 ${busy ? "animate-spin" : ""}`} /> Vérifier
        </Button>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-xs text-muted-foreground">
          Écrans nécessaires pour un fonctionnement complet hors ligne. Une croix signifie qu'un rafraîchissement réseau reste nécessaire pour cette route.
        </p>
        <div className="grid gap-1 text-xs">
          {rows.map((r) => (
            <div key={r.url} className="flex items-center justify-between rounded border border-border/50 px-2 py-1">
              <code className="font-mono">{r.url}</code>
              {r.cached ? (
                <span className="flex items-center gap-1 text-success"><CheckCircle2 className="h-3 w-3" /> disponible</span>
              ) : (
                <span className="flex items-center gap-1 text-destructive"><XCircle className="h-3 w-3" /> non trouvé</span>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
