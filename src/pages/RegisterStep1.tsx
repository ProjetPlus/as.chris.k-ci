import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectItem } from "@/components/ui/select";
import { PageTitle } from "@/pages/pageUtils";
import { normalizeMemberPhoto } from "@/lib/photoBackground";
import { toast } from "sonner";

const DRAFT = "aschrisk.registration.draft.v2";
const readDraft = () => { try { return JSON.parse(sessionStorage.getItem(DRAFT) || "{}"); } catch { return {}; } };

const PAYMENT_METHODS: Array<{ value: string; label: string }> = [
  { value: "especes", label: "Espèces" },
  { value: "wave", label: "Wave" },
  { value: "orange", label: "Orange Money" },
  { value: "mtn", label: "MTN Money" },
  { value: "moov", label: "Moov Money" },
];

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export default function RegisterStep1() {
  const navigate = useNavigate();
  const [form, setForm] = useState<any>(readDraft());
  const [photoBusy, setPhotoBusy] = useState(false);
  const [proofBusy, setProofBusy] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);
  const proofInput = useRef<HTMLInputElement>(null);

  const set = (k: string, v: any) => setForm((f: any) => {
    const n = { ...f, [k]: v };
    sessionStorage.setItem(DRAFT, JSON.stringify(n));
    return n;
  });

  const handlePhoto = async (file: File) => {
    setPhotoBusy(true);
    try {
      const dataUrl = await normalizeMemberPhoto(file);
      set("photo", dataUrl);
      toast.success("Photo traitée — arrière-plan gris perle appliqué");
    } catch (e) {
      // Fallback: keep raw image if bg removal fails offline model not ready
      try {
        set("photo", await fileToDataUrl(file));
        toast.warning("Photo enregistrée sans retrait d'arrière-plan");
      } catch {
        toast.error("Impossible de charger la photo");
      }
    } finally {
      setPhotoBusy(false);
    }
  };

  const handleProof = async (file: File) => {
    setProofBusy(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      set("adhesion_proof_type", "recu");
      set("adhesion_proof_data", dataUrl);
      set("adhesion_transaction_id", "");
      toast.success("Reçu enregistré");
    } catch {
      toast.error("Impossible de charger le reçu");
    } finally {
      setProofBusy(false);
    }
  };

  const clearProof = () => {
    set("adhesion_proof_type", "");
    set("adhesion_proof_data", "");
    set("adhesion_transaction_id", "");
  };

  const method = form.adhesion_payment_method || "especes";
  const isMobileMoney = method !== "especes";
  const proofType: string = form.adhesion_proof_type || (form.adhesion_transaction_id ? "transaction_id" : (form.adhesion_proof_data ? "recu" : ""));

  return (
    <div>
      <PageTitle title="Inscription membre" subtitle="Identité, photo, contact et paiement d'adhésion" />

      <div className="rounded-lg border bg-card p-5 grid gap-4 md:grid-cols-3">
        {/* Photo */}
        <div className="md:col-span-1 flex flex-col items-center gap-3">
          <Label>Photo du membre</Label>
          <div className="relative w-40 h-52 rounded-md border-2 border-dashed border-border bg-secondary/30 overflow-hidden flex items-center justify-center">
            {form.photo ? (
              <img src={form.photo} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs text-muted-foreground text-center px-2">Aucune photo</span>
            )}
            {photoBusy && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/70">
                <Loader2 className="animate-spin" />
              </div>
            )}
          </div>
          <input
            ref={photoInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhoto(f); e.target.value = ""; }}
          />
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => photoInput.current?.click()} disabled={photoBusy}>
              <Upload className="w-4 h-4 mr-1" /> {form.photo ? "Changer" : "Ajouter"}
            </Button>
            {form.photo && (
              <Button type="button" variant="ghost" size="sm" onClick={() => set("photo", "")}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground text-center">L'arrière-plan est retiré automatiquement puis remplacé par du gris perle.</p>
        </div>

        {/* Identity fields */}
        <div className="md:col-span-2 grid gap-4 md:grid-cols-2">
          <div><Label>Nom</Label><Input value={form.last_name || ""} onChange={(e) => set("last_name", e.target.value)} /></div>
          <div><Label>Prénom</Label><Input value={form.first_name || ""} onChange={(e) => set("first_name", e.target.value)} /></div>
          <div><Label>Téléphone</Label><Input value={form.phone || "+225 "} onChange={(e) => set("phone", e.target.value)} /></div>
          <div><Label>WhatsApp</Label><Input value={form.whatsapp || "+225 "} onChange={(e) => set("whatsapp", e.target.value)} /></div>
          <div><Label>Campement</Label><Input value={form.campement || ""} onChange={(e) => set("campement", e.target.value)} /></div>
          <div><Label>Sous préfecture</Label><Input value={form.sous_prefecture || ""} onChange={(e) => set("sous_prefecture", e.target.value)} /></div>
          <div>
            <Label>Type de pièce</Label>
            <Select value={form.id_type || "CNI"} onValueChange={(v) => set("id_type", v)}>
              <SelectItem value="CNI">CNI</SelectItem>
              <SelectItem value="Attestation">Attestation</SelectItem>
              <SelectItem value="Passeport">Passeport</SelectItem>
            </Select>
          </div>
          <div><Label>Numéro de pièce</Label><Input value={form.id_number || ""} onChange={(e) => set("id_number", e.target.value)} /></div>
        </div>

        {/* Payment block */}
        <div className="md:col-span-3 border-t pt-5">
          <h2 className="font-semibold mb-3">Paiement de l'adhésion</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={Boolean(form.adhesion_paid)} onChange={(e) => set("adhesion_paid", e.target.checked)} />
              Adhésion payée
            </label>
            <div>
              <Label>Moyen de paiement</Label>
              <Select value={method} onValueChange={(v) => set("adhesion_payment_method", v)}>
                {PAYMENT_METHODS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </Select>
            </div>
            <div>
              <Label>Date de paiement</Label>
              <Input type="date" value={form.adhesion_payment_date || ""} onChange={(e) => set("adhesion_payment_date", e.target.value)} />
            </div>
          </div>

          {form.adhesion_paid && (
            <div className="mt-4 rounded-md border bg-secondary/30 p-4">
              <Label className="mb-2 block">Preuve de paiement</Label>
              {isMobileMoney && (
                <div className="flex flex-wrap gap-3 mb-3 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={proofType === "recu"}
                      onChange={() => { set("adhesion_proof_type", "recu"); set("adhesion_transaction_id", ""); }}
                    /> Reçu (photo)
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={proofType === "transaction_id"}
                      onChange={() => { set("adhesion_proof_type", "transaction_id"); set("adhesion_proof_data", ""); }}
                    /> ID de transaction
                  </label>
                </div>
              )}

              {(!isMobileMoney || proofType === "recu") && (
                <div className="flex items-center gap-3">
                  <input
                    ref={proofInput}
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleProof(f); e.target.value = ""; }}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => proofInput.current?.click()} disabled={proofBusy}>
                    {proofBusy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
                    {form.adhesion_proof_data ? "Remplacer le reçu" : "Téléverser le reçu"}
                  </Button>
                  {form.adhesion_proof_data && (
                    <>
                      <a href={form.adhesion_proof_data} target="_blank" rel="noreferrer" className="text-xs text-primary underline">Voir</a>
                      <Button type="button" variant="ghost" size="sm" onClick={clearProof}><X className="w-4 h-4" /></Button>
                    </>
                  )}
                </div>
              )}

              {isMobileMoney && proofType === "transaction_id" && (
                <Input
                  placeholder="ID de transaction Mobile Money"
                  value={form.adhesion_transaction_id || ""}
                  onChange={(e) => set("adhesion_transaction_id", e.target.value)}
                />
              )}
            </div>
          )}
        </div>

        <div className="md:col-span-3 flex justify-end">
          <Button onClick={() => navigate("/register/step2")}>Continuer</Button>
        </div>
      </div>
    </div>
  );
}
