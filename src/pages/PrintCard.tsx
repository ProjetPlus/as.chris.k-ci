import { useRef, useState } from "react";
import { Download, Printer, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { MemberCard, CARD_H_PX, CARD_W_PX } from "@/components/MemberCard";
import { exportCardPdf, printCard } from "@/lib/cardExport";
import { DEFAULT_SETTINGS, nowIso } from "@/lib/memberWorkflow";
import { OFFICIAL_ASCHRISK_LOGO_URL } from "@/assets/aschriskOfficialLogo";
import type { DbMember, DbSettings } from "@/db/database";

const db = supabase as any;

function toMember(row: any): DbMember {
  return {
    id: row.id,
    member_id: row.member_id,
    first_name: row.first_name || "",
    last_name: row.last_name || "",
    phone: row.phone || "",
    campement: row.campement || "",
    sous_prefecture: row.sous_prefecture || "",
    id_type: "",
    photo: row.photo || "",
    registration_date: row.registration_date,
    status: row.status,
    adhesion_paid: !!row.adhesion_paid,
    adhesion_amount: Number(row.adhesion_amount || 0),
    secondary_members: Array.isArray(row.secondary_members) ? row.secondary_members : [],
    guardian: row.guardian || {},
    total_covered_persons: Number(row.total_covered_persons || 1),
    contribution_status: row.contribution_status || "à_jour",
    created_at: nowIso(),
    updated_at: nowIso(),
  } as DbMember;
}

export default function PrintCard() {
  const [query, setQuery] = useState("");
  const [member, setMember] = useState<DbMember | null>(null);
  const [settings, setSettings] = useState<DbSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<null | "print" | "pdf">(null);
  const [error, setError] = useState("");

  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);

  const search = async () => {
    const id = query.trim();
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const [{ data, error: err }, { data: s }] = await Promise.all([
        db.rpc("get_member_card", { p_member_id: id }),
        db.rpc("get_card_settings"),
      ]);
      if (err) throw err;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) {
        setMember(null);
        setError(`Aucun membre trouvé pour le numéro « ${id} ».`);
        return;
      }
      const conf = Array.isArray(s) ? s[0] : s;
      if (conf) setSettings({ ...DEFAULT_SETTINGS, ...conf });
      setMember(toMember(row));
    } catch (e: any) {
      setError(e?.message || "Recherche impossible. Vérifiez votre connexion.");
    } finally {
      setLoading(false);
    }
  };

  const doPrint = async () => {
    if (!frontRef.current || !backRef.current) return;
    setBusy("print");
    try { await printCard(frontRef.current, backRef.current); }
    catch (e: any) { toast.error(e?.message || "Impression impossible"); }
    finally { setBusy(null); }
  };

  const doDownload = async () => {
    if (!frontRef.current || !backRef.current || !member) return;
    setBusy("pdf");
    try {
      await exportCardPdf(frontRef.current, backRef.current, `carte_${String(member.member_id).replace(/\s+/g, "_")}.pdf`, "cr80");
    } catch (e: any) { toast.error(e?.message || "Téléchargement impossible"); }
    finally { setBusy(null); }
  };

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex items-center gap-4">
          <img src={OFFICIAL_ASCHRISK_LOGO_URL} alt="AS.CHRIS.K" className="h-16 w-auto" />
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Portail d'impression AS.CHRIS.K</h1>
            <p className="text-sm text-muted-foreground">Lecture seule — saisissez un numéro de membre pour imprimer ou télécharger sa carte.</p>
          </div>
        </header>

        <section className="flex flex-col gap-3 rounded-lg border bg-card p-5 shadow-sm sm:flex-row">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="Numéro de membre (ex. A-26-001)"
            className="flex-1"
          />
          <Button onClick={search} disabled={loading}>
            <Search className="mr-2 h-4 w-4" />{loading ? "Recherche…" : "Rechercher"}
          </Button>
        </section>

        {error && <p className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">{error}</p>}

        {member && (
          <>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button onClick={doPrint} disabled={busy !== null}>
                <Printer className="mr-2 h-4 w-4" />{busy === "print" ? "Préparation…" : "Imprimer"}
              </Button>
              <Button variant="outline" onClick={doDownload} disabled={busy !== null}>
                <Download className="mr-2 h-4 w-4" />{busy === "pdf" ? "Génération…" : "Télécharger le PDF"}
              </Button>
            </div>

            <div className="mt-8 grid gap-8 lg:grid-cols-2">
              <Stage label="Recto"><MemberCard ref={frontRef} member={member} settings={settings} side="front" /></Stage>
              <Stage label="Verso"><MemberCard ref={backRef} member={member} settings={settings} side="back" /></Stage>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function Stage({ label, children }: { label: string; children: React.ReactNode }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  const measure = (el: HTMLDivElement | null) => {
    if (!el) return;
    (boxRef as any).current = el;
    const apply = () => setScale(Math.min(1, el.clientWidth / CARD_W_PX));
    apply();
    new ResizeObserver(apply).observe(el);
  };
  return (
    <div className="space-y-3">
      <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</div>
      <div ref={measure} className="w-full" style={{ height: CARD_H_PX * scale, position: "relative" }}>
        <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: CARD_W_PX, height: CARD_H_PX }}>
          {children}
        </div>
      </div>
    </div>
  );
}
