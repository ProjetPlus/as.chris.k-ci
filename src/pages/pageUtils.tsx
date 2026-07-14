import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/memberWorkflow";

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return <div className="mb-6"><h1 className="text-3xl font-display font-bold text-foreground tracking-normal">{title}</h1>{subtitle && <p className="text-muted-foreground mt-1">{subtitle}</p>}</div>;
}

export function StatCard({ label, value }: { label: string; value: string | number }) {
  return <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground font-sans">{label}</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-primary">{value}</div></CardContent></Card>;
}

export function fmtDate(value?: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.split("/").join(".");
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}

export function money(value: number) { return formatCurrency(value).split("/").join(" "); }

export function csvDownload(filename: string, rows: Array<Record<string, unknown>>) {
  const headers = Object.keys(rows[0] || { message: "Aucune donnée" });
  const clean = (v: unknown) => String(v ?? "").split("/").join(" ").split("\n").join(" ").split(";").join(",");
  const body = [headers.join(";"), ...rows.map((row) => headers.map((h) => clean(row[h])).join(";"))].join("\n");
  const blob = new Blob([body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
