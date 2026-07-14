import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSettings } from "@/db/useDb";
import { PageTitle } from "@/pages/pageUtils";

export default function Settings() {
  const { settings, updateSettings } = useSettings();
  const save = (key: string, value: string) => updateSettings({ [key]: key.includes("amount") || key.includes("fee") || key.includes("payout") || key.includes("retained") ? Number(value) : value } as any);
  return <div><PageTitle title="Paramètres" subtitle="Lecture et écriture locale puis synchronisation permissive" /><div className="rounded-lg border bg-card p-5 grid gap-4 md:grid-cols-2"><div className="md:col-span-2"><Label>Nom association</Label><Input defaultValue={settings.association_name} onBlur={(e) => save("association_name", e.target.value)} /></div><div><Label>Initiales ID</Label><Input defaultValue={settings.initials} onBlur={(e) => save("initials", e.target.value)} /></div><div><Label>Téléphone</Label><Input defaultValue={settings.phone} onBlur={(e) => save("phone", e.target.value)} /></div><div><Label>Adhésion FCFA</Label><Input type="number" defaultValue={settings.adhesion_fee} onBlur={(e) => save("adhesion_fee", e.target.value)} /></div><div><Label>Cotisation décès FCFA</Label><Input type="number" defaultValue={settings.contribution_amount} onBlur={(e) => save("contribution_amount", e.target.value)} /></div><div><Label>Versement principal FCFA</Label><Input type="number" defaultValue={settings.principal_payout} onBlur={(e) => save("principal_payout", e.target.value)} /></div><div><Label>Versement ayant droit FCFA</Label><Input type="number" defaultValue={settings.secondary_payout} onBlur={(e) => save("secondary_payout", e.target.value)} /></div><div><Label>Retenue FCFA</Label><Input type="number" defaultValue={settings.secondary_retained} onBlur={(e) => save("secondary_retained", e.target.value)} /></div><div className="md:col-span-2"><Button onClick={() => updateSettings({ updated_at: new Date().toISOString() })}>Confirmer</Button></div></div></div>;
}
