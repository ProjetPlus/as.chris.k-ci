import { useState } from "react";
import { Download, FileJson, FileText, HardDrive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import jsPDF from "jspdf";
import {
  getQueue,
  getQueueStats,
  getSyncLog,
  getLastSuccessfulSync,
  getLastSyncAttempt,
  isOnline,
} from "@/lib/offline";
import { getRealtimeDiagnostics } from "@/lib/realtime";
import { toast } from "sonner";

async function collectSwState() {
  if (!("serviceWorker" in navigator)) return { supported: false };
  const regs = await navigator.serviceWorker.getRegistrations().catch(() => []);
  return {
    supported: true,
    controller: !!navigator.serviceWorker.controller,
    registrations: regs.map((r) => ({
      scope: r.scope,
      active: r.active?.scriptURL,
      waiting: r.waiting?.scriptURL,
      installing: r.installing?.scriptURL,
    })),
  };
}

async function collectCacheContents() {
  if (!("caches" in window)) return { supported: false };
  const names = await caches.keys();
  const out: Record<string, string[]> = {};
  for (const n of names) {
    const c = await caches.open(n);
    const keys = await c.keys();
    out[n] = keys.map((r) => r.url).slice(0, 200);
  }
  return { supported: true, caches: out };
}

async function buildReport() {
  const [sw, cacheContents] = await Promise.all([collectSwState(), collectCacheContents()]);
  return {
    generatedAt: new Date().toISOString(),
    app: "AS.CHRIS.K",
    online: isOnline(),
    lastSuccessfulSync: getLastSuccessfulSync(),
    lastSyncAttempt: getLastSyncAttempt(),
    queueStats: getQueueStats(),
    queue: getQueue(),
    log: getSyncLog(),
    realtime: getRealtimeDiagnostics(),
    serviceWorker: sw,
    cache: cacheContents,
    userAgent: navigator.userAgent,
  };
}

export function DiagnosticExport() {
  const [busy, setBusy] = useState<null | "json" | "pdf">(null);

  const download = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const exportJson = async () => {
    setBusy("json");
    try {
      const report = await buildReport();
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
      download(blob, `aschrisk_diagnostic_${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
      toast.success("Rapport JSON téléchargé");
    } finally {
      setBusy(null);
    }
  };

  const exportPdf = async () => {
    setBusy("pdf");
    try {
      const r = await buildReport();
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      let y = 15;
      const line = (label: string, value: string, big = false) => {
        if (y > 275) { doc.addPage(); y = 15; }
        if (big) { doc.setFont("helvetica", "bold"); doc.setFontSize(12); }
        else { doc.setFont("helvetica", "normal"); doc.setFontSize(9); }
        const wrapped = doc.splitTextToSize(`${label}${label ? ": " : ""}${value}`, 180);
        doc.text(wrapped, 15, y);
        y += wrapped.length * (big ? 6 : 4.5) + (big ? 2 : 0);
      };
      line("", "Rapport de diagnostic AS.CHRIS.K", true);
      line("Généré le", new Date(r.generatedAt).toLocaleString("fr-FR"));
      line("En ligne", r.online ? "oui" : "non");
      line("Dernière sync réussie", r.lastSuccessfulSync ? new Date(r.lastSuccessfulSync).toLocaleString("fr-FR") : "jamais");
      line("Dernière tentative", r.lastSyncAttempt ? new Date(r.lastSyncAttempt).toLocaleString("fr-FR") : "aucune");
      y += 3;
      line("", "File d'attente", true);
      line("Total", String(r.queueStats.total));
      line("Avec retries", String(r.queueStats.withRetries));
      line("Par opération", JSON.stringify(r.queueStats.byOp));
      line("Par table", JSON.stringify(r.queueStats.byTable));
      y += 3;
      line("", "Erreurs récentes (ayants droit / tutel)", true);
      const errs = r.log.filter((e) => e.status === "failed").slice(0, 15);
      if (!errs.length) line("", "Aucune erreur enregistrée.");
      errs.forEach((e) => line(new Date(e.ts).toLocaleTimeString(), `${e.table} · ${e.details || ""} — ${e.error || ""}`));
      y += 3;
      line("", "Service Worker", true);
      line("Supporté", (r.serviceWorker as any).supported ? "oui" : "non");
      line("Contrôleur actif", (r.serviceWorker as any).controller ? "oui" : "non");
      const regs: any[] = (r.serviceWorker as any).registrations || [];
      regs.forEach((rg, i) => line(`Reg #${i + 1}`, `scope=${rg.scope} active=${rg.active || "—"}`));
      y += 3;
      line("", "Caches précompilés", true);
      const caches = (r.cache as any).caches || {};
      Object.entries(caches).forEach(([name, urls]: any) => line(name, `${urls.length} ressource(s)`));
      doc.save(`aschrisk_diagnostic_${new Date().toISOString().replace(/[:.]/g, "-")}.pdf`);
      toast.success("Rapport PDF téléchargé");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <HardDrive className="h-4 w-4" /> Rapport de diagnostic
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-xs text-muted-foreground">
          État du Service Worker, files d'attente, dernière synchronisation, erreurs ayants droit / tutel.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={exportJson} disabled={busy !== null}>
            <FileJson className="mr-1 h-3 w-3" />
            {busy === "json" ? "Génération…" : "Exporter JSON"}
          </Button>
          <Button size="sm" variant="outline" onClick={exportPdf} disabled={busy !== null}>
            <FileText className="mr-1 h-3 w-3" />
            {busy === "pdf" ? "Génération…" : "Exporter PDF"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
