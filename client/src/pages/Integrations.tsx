import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  ArrowRight,
  Check,
  ChevronRight,
  CircleDot,
  Code2,
  Copy,
  FileJson,
  Inbox,
  KeyRound,
  LockKeyhole,
  RefreshCw,
  Send,
  ShieldCheck,
  Webhook,
} from "lucide-react";
import { useState } from "react";

const events = [
  {
    name: "coupon.created",
    description: "Cupom criado e identificado.",
    direction: "Entrada e saída",
    tone: "bg-[#fff6bf] text-[#806b00]",
    icon: FileJson,
  },
  {
    name: "coupon.published",
    description: "Cupom publicado para disponibilidade.",
    direction: "Entrada e saída",
    tone: "bg-[#e3f1ff] text-[#21679f]",
    icon: Send,
  },
  {
    name: "coupon.activated",
    description: "Cupom passa ao estado ativo.",
    direction: "Entrada e saída",
    tone: "bg-[#e2f7eb] text-[#16734b]",
    icon: CircleDot,
  },
  {
    name: "coupon.redeemed",
    description: "Utilização aceita e registrada.",
    direction: "Entrada e saída",
    tone: "bg-[#f1e8ff] text-[#7440ab]",
    icon: Check,
  },
];

const envelope = `{
  "id": "evt_01JEXAMPLE",
  "event": "coupon.redeemed",
  "version": "2026-01",
  "occurredAt": "2026-08-25T15:00:00.000Z",
  "source": "backoffice",
  "coupon": {
    "id": "coupon_123",
    "code": "TESTE10",
    "partnerId": "partner_456"
  },
  "data": {
    "usageId": "usage_789",
    "reference": "pedido-123"
  }
}`;

export default function Integrations() {
  const [copied, setCopied] = useState(false);

  async function copyEnvelope() {
    await navigator.clipboard?.writeText(envelope);
    setCopied(true);
    toast.success("Exemplo copiado");
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="mx-auto max-w-[1480px] space-y-7">
      <section className="relative overflow-hidden rounded-[2rem] bg-[#111418] p-7 text-white shadow-xl shadow-black/5 sm:p-9">
        <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full border-[28px] border-primary/95" />
        <div className="pointer-events-none absolute bottom-0 right-24 h-20 w-20 rounded-full bg-white/[0.03]" />
        <div className="relative z-10 max-w-3xl">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge className="border-0 bg-primary/15 text-primary hover:bg-primary/15">INTEGRAÇÕES</Badge>
            <Badge className="border border-white/10 bg-white/8 text-white/65 hover:bg-white/8">Somente testes locais</Badge>
          </div>
          <h1 className="max-w-2xl text-3xl font-extrabold tracking-[-0.04em] sm:text-5xl">Webhooks de cupons, com rastreabilidade.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/60 sm:text-base">
            Centralize as regras para conversar com parceiros com segurança. O contrato está pronto para homologação, enquanto os endpoints reais permanecem desativados.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button className="h-11 gap-2 font-bold" onClick={() => toast.info("A configuração por parceiro será habilitada na próxima etapa.")}>
              Configurar integração <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="h-11 border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white" onClick={() => document.getElementById("contrato")?.scrollIntoView({ behavior: "smooth" })}>
              Ver contrato
            </Button>
          </div>
        </div>
        <div className="relative z-10 mt-9 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["4", "eventos cobertos"],
            ["HMAC", "assinatura"],
            ["5 min", "janela de timestamp"],
            ["0", "endpoints ativos"],
          ].map(([value, label]) => (
            <div key={label} className="rounded-2xl border border-white/8 bg-white/[0.05] p-4">
              <p className="text-lg font-extrabold tracking-tight text-white">{value}</p>
              <p className="mt-1 text-[11px] font-medium text-white/45">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
        <Card className="overflow-hidden border-0 shadow-sm shadow-black/[0.04]">
          <CardHeader className="flex flex-row items-start justify-between gap-4 p-6 pb-4 sm:p-7 sm:pb-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Mapa de eventos</p>
              <CardTitle className="mt-2 text-xl tracking-tight">O que o contrato cobre</CardTitle>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff8c9] text-[#857000]"><Webhook className="h-5 w-5" /></div>
          </CardHeader>
          <CardContent className="space-y-2 p-6 pt-0 sm:p-7 sm:pt-0">
            {events.map(event => {
              const Icon = event.icon;
              return (
                <div key={event.name} className="group flex items-center gap-4 rounded-2xl border border-black/[0.05] bg-[#fbfbf8] p-3 transition-colors hover:bg-white">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${event.tone}`}><Icon className="h-4 w-4" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-sm font-bold text-foreground">{event.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{event.description}</p>
                  </div>
                  <Badge variant="outline" className="hidden shrink-0 border-black/10 bg-white text-[10px] font-semibold sm:inline-flex">{event.direction}</Badge>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border-0 bg-[#fffdf0] shadow-sm shadow-black/[0.04]">
          <CardHeader className="p-6 pb-3 sm:p-7 sm:pb-4">
            <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#111418] text-primary"><ShieldCheck className="h-5 w-5" /></div><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#806b00]">Postura atual</p><CardTitle className="mt-1 text-xl tracking-tight">Seguro por padrão</CardTitle></div></div>
          </CardHeader>
          <CardContent className="space-y-5 p-6 pt-2 sm:p-7 sm:pt-3">
            <p className="text-sm leading-6 text-muted-foreground">O backoffice mantém o contrato documentado e testado, mas não envia dados para parceiros sem homologação explícita.</p>
            <div className="space-y-3">
              {[
                [KeyRound, "HMAC-SHA-256", "Assinatura do corpo bruto"],
                [LockKeyhole, "Idempotência", "Proteção contra duplicidade"],
                [RefreshCw, "Replay controlado", "Timestamp em janela de 5 min"],
              ].map(([Icon, title, description]) => {
                const SecurityIcon = Icon as typeof KeyRound;
                return <div key={title as string} className="flex gap-3"><SecurityIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#806b00]" /><div><p className="text-xs font-bold">{title as string}</p><p className="mt-0.5 text-[11px] text-muted-foreground">{description as string}</p></div></div>;
              })}
            </div>
            <div className="rounded-2xl border border-[#e8d977] bg-white/70 p-4"><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#806b00]">Status da integração real</p><div className="mt-2 flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#d7a400]" /><span className="text-sm font-bold">Não ativada</span></div></div>
          </CardContent>
        </Card>
      </section>

      <section id="contrato" className="grid scroll-mt-6 gap-5 lg:grid-cols-[0.82fr_1.18fr]">
        <Card className="border-0 shadow-sm shadow-black/[0.04]">
          <CardHeader className="p-6 pb-4 sm:p-7 sm:pb-5"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Envelope padrão</p><CardTitle className="mt-2 text-xl tracking-tight">Um formato, dois caminhos</CardTitle></CardHeader>
          <CardContent className="p-6 pt-0 sm:p-7 sm:pt-0"><p className="text-sm leading-6 text-muted-foreground">O mesmo contrato suporta eventos originados pelo backoffice ou pelo sistema parceiro. A origem fica explícita para facilitar auditoria.</p><div className="mt-6 flex items-center gap-3"><div className="flex h-11 flex-1 items-center gap-3 rounded-xl bg-[#f7f7f3] px-4"><Code2 className="h-4 w-4 text-muted-foreground" /><span className="font-mono text-xs font-bold">version: 2026-01</span></div><Badge className="border-0 bg-[#e3f1ff] text-[#21679f] hover:bg-[#e3f1ff]">JSON</Badge></div><Separator className="my-6" /><div className="space-y-4"><div className="flex gap-3"><Send className="mt-0.5 h-4 w-4 text-[#21679f]" /><div><p className="text-xs font-bold">Saída para parceiro</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Publicar mudanças autorizadas do ciclo de vida do cupom.</p></div></div><div className="flex gap-3"><Inbox className="mt-0.5 h-4 w-4 text-[#16734b]" /><div><p className="text-xs font-bold">Entrada do parceiro</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Receber criação ou resgate com assinatura e idempotência.</p></div></div></div></CardContent>
        </Card>

        <Card className="overflow-hidden border-0 bg-[#15191d] text-white shadow-sm shadow-black/10">
          <CardHeader className="flex flex-row items-center justify-between gap-4 border-b border-white/10 p-5 sm:p-6"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Exemplo de payload</p><CardTitle className="mt-2 text-lg tracking-tight text-white">coupon.redeemed</CardTitle></div><Button size="sm" variant="outline" onClick={copyEnvelope} className="gap-2 border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white">{copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{copied ? "Copiado" : "Copiar"}</Button></CardHeader>
          <CardContent className="overflow-x-auto p-5 sm:p-6"><pre className="min-w-[480px] font-mono text-[11px] leading-6 text-white/65"><code>{envelope}</code></pre></CardContent>
        </Card>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-0 shadow-sm shadow-black/[0.04]">
          <CardHeader className="p-6 pb-4 sm:p-7 sm:pb-5"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Respostas esperadas</p><CardTitle className="mt-2 text-xl tracking-tight">Contrato de retorno</CardTitle></CardHeader>
          <CardContent className="space-y-2 p-6 pt-0 sm:p-7 sm:pt-0">
            {[
              ["200 / 204", "Processado ou duplicado", "text-[#16734b] bg-[#e2f7eb]"],
              ["400", "JSON ou schema inválido", "text-[#9a5c10] bg-[#fff1d7]"],
              ["401", "Assinatura ou timestamp inválido", "text-[#a33939] bg-[#ffe7e7]"],
              ["409", "Transição de negócio inválida", "text-[#7440ab] bg-[#f1e8ff]"],
              ["5xx", "Falha temporária elegível a retry", "text-[#21679f] bg-[#e3f1ff]"],
            ].map(([code, description, tone]) => <div key={code} className="flex items-center gap-3 rounded-xl border border-black/[0.04] p-3"><span className={`rounded-lg px-2 py-1 font-mono text-[10px] font-bold ${tone}`}>{code}</span><span className="text-xs font-medium text-muted-foreground">{description}</span></div>)}
          </CardContent>
        </Card>
        <Card className="border-0 bg-[#111418] text-white shadow-sm shadow-black/10">
          <CardHeader className="p-6 pb-4 sm:p-7 sm:pb-5"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Próxima etapa</p><CardTitle className="mt-2 text-xl tracking-tight text-white">Pronto para homologar</CardTitle></CardHeader>
          <CardContent className="p-6 pt-0 sm:p-7 sm:pt-0"><p className="text-sm leading-6 text-white/60">Antes da ativação, cada parceiro deverá ter endpoint, segredo próprio, eventos autorizados, limites, responsável e procedimento de revogação definidos.</p><Button variant="outline" className="mt-6 h-10 gap-2 border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white" onClick={() => toast.info("A homologação será iniciada após a aprovação do contrato.")}>Ver checklist futuro <ArrowRight className="h-4 w-4" /></Button></CardContent>
        </Card>
      </section>
    </div>
  );
}
