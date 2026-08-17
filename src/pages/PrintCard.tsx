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

const CACHE_KEY = "aschrisk.print.cache.v1";
const SNAPSHOT_KEY = "aschrisk.db.snapshot.v6";

const norm = (v: string) => (v || "").replace(/[^0-9A-Za-z]/g, "").toUpperCase();
const tail = (v: string) => (v || "").replace(/\D/g, "").slice(-10);

type CacheShape = { members: Record<string, any>; settings?: any };

function readCache(): CacheShape {
  try { return { members: {}, ...JSON.parse(localStorage.getItem(CACHE_KEY) || "{}") }; } catch { return { members: {} }; }
}

function writeCache(row: any, conf: any) {
  const cache = readCache();
  const keys = [norm(row.member_id), tail(row.phone)].filter((k) => k && k.length >= 6);
  keys.forEach((k) => { cache.members[k] = row; });
  if (conf) cache.settings = conf;
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch { /* quota */ }
}

/** Offline lookup: printed-card cache first, then the full local app snapshot. */
function findLocally(q: string): { row: any; conf: any } | null {
  const key = norm(q);
  const phone = tail(q);
  const cache = readCache();
  const cached = cache.members[key] || (phone.length >= 8 ? cache.members[phone] : undefined);
  if (cached) return { row: cached, conf: cache.settings };
  try {
    const snap = JSON.parse(localStorage.getItem(SNAPSHOT_KEY) || "{}");
    const row = (snap.members || []).find(
      (m: any) => norm(m.member_id) === key ||
        (phone.length >= 8 && (tail(m.phone) === phone || tail(m.phone_secondary) === phone)),
    );
    if (row) return { row, conf: snap.settings };
  } catch { /* ignore */ }
  return null;
}

export default function PrintCard() {
  const [query, setQuery] = useState("");
  const [member, setMember] = useState<DbMember | null>(null);
  const [settings, setSettings] = useState<DbSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<null | "print" | "pdf">(null);
  const [error, setError] = useState("");
  const [offline, setOffline] = useState(false);

  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);

  const apply = (row: any, conf: any, fromCache: boolean) => {
    if (conf) setSettings({ ...DEFAULT_SETTINGS, ...conf });
    setMember(toMember(row));
    setOffline(fromCache);
  };

  const search = async () => {
    const id = query.trim();
    if (!id) return;
    if (norm(id).length < 6) {
      setError("Saisissez un numéro de téléphone complet ou un numéro de membre.");
      return;
    }
    setLoading(true);
    setError("");
    setOffline(false);
    const local = findLocally(id);
    try {
      if (!navigator.onLine) throw new Error("offline");
      const [{ data, error: err }, { data: s }] = await Promise.all([
        db.rpc("find_member_card_public", { p_query: id }),
        db.rpc("get_card_settings_public"),
      ]);
      if (err) throw err;
      const row = Array.isArray(data) ? data[0] : data;
      const conf = Array.isArray(s) ? s[0] : s;
      if (!row) {
        if (local) { apply(local.row, local.conf, true); return; }
        setMember(null);
        setError(`Aucun membre trouvé pour « ${id} ».`);
        return;
      }
      writeCache(row, conf);
      apply(row, conf, false);
    } catch (e: any) {
      if (local) { apply(local.row, local.conf, true); return; }
      setMember(null);
      setError(
        navigator.onLine
          ? String(e?.message || "Recherche impossible.")
          : `Hors ligne : aucune carte enregistrée localement pour « ${id} ».`,
      );
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
            <p className="text-sm text-muted-foreground">Sans connexion au compte — saisissez le numéro de téléphone (ou le numéro de membre) pour imprimer ou télécharger la carte.</p>
          </div>
        </header>

        <section className="flex flex-col gap-3 rounded-lg border bg-card p-5 shadow-sm sm:flex-row">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="Téléphone (ex. 0102806057) ou numéro de membre"
            inputMode="tel"
            className="flex-1"
          />
          <Button onClick={search} disabled={loading}>
            <Search className="mr-2 h-4 w-4" />{loading ? "Recherche…" : "Rechercher"}
          </Button>
        </section>

        {error && <p className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">{error}</p>}
        {offline && member && (
          <p className="mt-4 rounded-md border border-primary/40 bg-primary/10 p-3 text-sm text-foreground">
            Carte affichée depuis la sauvegarde locale (hors ligne).
          </p>
        )}

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
