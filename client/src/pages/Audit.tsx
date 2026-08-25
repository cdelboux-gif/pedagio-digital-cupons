import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { FileClock, Filter, RefreshCw, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";

const resourceOptions = [
  ["", "Todos os recursos"],
  ["access", "Acessos"],
  ["login_invite", "Convites"],
  ["email_template", "Templates"],
  ["email_rule", "Regras de e-mail"],
  ["email_outbox", "Outbox"],
  ["partner", "Parceiros"],
  ["store", "Lojas"],
  ["coupon", "Cupons"],
] as const;

const actionLabel: Record<string, string> = {
  create: "Criou", update: "Atualizou", status_change: "Alterou status", delete: "Excluiu logicamente", revoke: "Revogou", activate: "Ativou", resend: "Reenviou", simulate: "Simulou",
};

function jsonPreview(value: string | null) {
  if (!value) return "—";
  try { return JSON.stringify(JSON.parse(value), null, 2); } catch { return value; }
}

export default function Audit() {
  const [resourceType, setResourceType] = useState("");
  const [resourceId, setResourceId] = useState("");
  const query = trpc.admin.audit.list.useQuery({ resourceType: resourceType ? resourceType as Exclude<typeof resourceOptions[number][0], ""> : undefined, resourceId: resourceId ? Number(resourceId) : undefined, limit: 100 });
  const rows = useMemo(() => query.data ?? [], [query.data]);

  return (
    <div className="mx-auto max-w-[1480px] space-y-7">
      <section className="relative overflow-hidden rounded-[2rem] bg-[#111418] p-7 text-white shadow-xl shadow-black/5 sm:p-9">
        <div className="pointer-events-none absolute -right-12 -top-20 h-56 w-56 rounded-full border-[26px] border-primary/80" />
        <div className="relative z-10 max-w-3xl">
          <Badge className="border-0 bg-primary/15 text-primary hover:bg-primary/15">GOVERNANÇA</Badge>
          <h1 className="mt-4 text-3xl font-extrabold tracking-[-0.04em] sm:text-5xl">Tudo que mudou, documentado.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/60 sm:text-base">A trilha registra quem alterou acessos, escopos, convites e configurações, com comparação antes/depois e sem persistir tokens ou segredos.</p>
        </div>
        <div className="relative z-10 mt-8 flex flex-wrap gap-3 text-xs text-white/55"><span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> Dados sensíveis redigidos</span><span className="flex items-center gap-2"><FileClock className="h-4 w-4 text-primary" /> Ordenado por ocorrência</span></div>
      </section>

      <Card className="border-0 shadow-sm shadow-black/[0.04]">
        <CardContent className="grid gap-4 p-5 sm:grid-cols-[1fr_160px_auto] sm:items-end sm:p-6">
          <div className="space-y-2"><Label>Recurso</Label><select value={resourceType} onChange={event => setResourceType(event.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">{resourceOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
          <div className="space-y-2"><Label>ID do recurso</Label><Input type="number" min="1" placeholder="Opcional" value={resourceId} onChange={event => setResourceId(event.target.value)} /></div>
          <Button variant="outline" className="gap-2" onClick={() => void query.refetch()}><RefreshCw className="h-4 w-4" />Atualizar</Button>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm shadow-black/[0.04]">
        <CardHeader className="flex flex-row items-center justify-between gap-3 p-6 pb-4 sm:p-7 sm:pb-5"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Linha do tempo</p><CardTitle className="mt-2 text-xl tracking-tight">Registro de auditoria</CardTitle></div><Badge variant="outline">{rows.length} eventos</Badge></CardHeader>
        <CardContent className="space-y-3 p-6 pt-0 sm:p-7 sm:pt-0">
          {rows.length ? rows.map(row => <article key={row.id} className="rounded-2xl border border-black/[0.06] bg-[#fbfbf8] p-4"><div className="flex flex-wrap items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f1e8ff] text-[#7440ab]"><FileClock className="h-4 w-4" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{actionLabel[row.action] ?? row.action} {row.resourceLabel || `${row.resourceType} #${row.resourceId ?? "—"}`}</p><Badge variant="outline" className="text-[10px]">{row.resourceType}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{row.actorEmail || "Ator não identificado"} · {new Date(row.createdAt).toLocaleString()}</p></div></div><div className="mt-4 grid gap-3 lg:grid-cols-2"><div><p className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Antes</p><pre className="max-h-40 overflow-auto rounded-xl bg-white p-3 font-mono text-[10px] leading-5 text-muted-foreground">{jsonPreview(row.beforeJson)}</pre></div><div><p className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Depois</p><pre className="max-h-40 overflow-auto rounded-xl bg-white p-3 font-mono text-[10px] leading-5 text-muted-foreground">{jsonPreview(row.afterJson)}</pre></div></div></article>) : <div className="rounded-2xl border border-dashed border-black/10 p-10 text-center"><Filter className="mx-auto h-7 w-7 text-muted-foreground/50" /><p className="mt-3 text-sm font-semibold">Nenhum evento encontrado</p><p className="mt-1 text-xs text-muted-foreground">As próximas alterações administrativas aparecerão aqui.</p></div>}
        </CardContent>
      </Card>
    </div>
  );
}
