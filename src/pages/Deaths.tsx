import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectItem } from "@/components/ui/select";
import { useDeaths, useMembers } from "@/db/useDb";
import { PageTitle, fmtDate, money } from "@/pages/pageUtils";
import { fullName, today } from "@/lib/memberWorkflow";

export default function Deaths() {
  const { members } = useMembers();
  const { deaths, registerPrincipalDeath } = useDeaths();
  const [memberId, setMemberId] = useState(members.find((m) => m.status === "actif")?.id || "");
  const [date, setDate] = useState(today());
  return <div><PageTitle title="Décès et promotion" subtitle="Le tutel devient membre successeur et reçoit les ayants droit actifs" /><section className="rounded-lg border bg-card p-5 flex flex-col gap-3 md:flex-row md:items-end"><div className="flex-1"><Select value={memberId} onValueChange={setMemberId}>{members.filter((m) => m.status === "actif").map((m) => <SelectItem key={m.id} value={m.id}>{fullName(m)} · {m.member_id}</SelectItem>)}</Select></div><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="md:w-48" /><Button onClick={() => registerPrincipalDeath(memberId, date)}>Déclarer et promouvoir</Button></section><div className="mt-5 grid gap-3">{deaths.map((d) => <article key={d.id} className="rounded-lg border bg-card p-4"><div className="flex justify-between"><strong>{d.deceased_name}</strong><span>{fmtDate(d.date_of_death)}</span></div><p className="text-sm text-muted-foreground">Cotisations attendues {money(d.total_expected_contributions)} · Versé {money(d.payout)}</p></article>)}{deaths.length === 0 && <p className="rounded-lg border bg-card p-6 text-muted-foreground">Aucun décès déclaré.</p>}</div></div>;
}
