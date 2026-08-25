import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
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

const eventOptions = [
  ["coupon.created", "Criação de cupom"],
  ["coupon.published", "Publicação de cupom"],
  ["coupon.activated", "Ativação de cupom"],
  ["coupon.redeemed", "Resgate de cupom"],
] as const;

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

function IntegrationManager() {
  const partnersQuery = trpc.admin.partners.list.useQuery({});
  const integrationsQuery = trpc.admin.integrations.list.useQuery();
  const utils = trpc.useUtils();
  const createMutation = trpc.admin.integrations.create.useMutation({
    onSuccess: result => {
      setLastSecret(result.secret);
      setName("");
      setEndpointUrl("");
      toast.success("Integração criada");
      void utils.admin.integrations.list.invalidate();
    },
    onError: error => toast.error(error.message || "Não foi possível criar a integração"),
  });
  const [partnerId, setPartnerId] = useState("");
  const [name, setName] = useState("");
  const [endpointUrl, setEndpointUrl] = useState("");
  const [status, setStatus] = useState<"active" | "paused">("active");
  const [selectedEvents, setSelectedEvents] = useState<string[]>(eventOptions.map(([event]) => event));
  const [lastSecret, setLastSecret] = useState<string | null>(null);

  function toggleEvent(event: string) {
    setSelectedEvents(current => current.includes(event) ? current.filter(item => item !== event) : [...current, event]);
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!partnerId || selectedEvents.length === 0) {
      toast.error("Selecione o parceiro e pelo menos um evento");
      return;
    }
    createMutation.mutate({
      partnerId: Number(partnerId),
      name,
      endpointUrl,
      allowedEvents: selectedEvents as (typeof eventOptions)[number][0][],
      status,
    });
  }

  return (
    <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
      <Card className="border-0 shadow-sm shadow-black/[0.04]">
        <CardHeader className="p-6 pb-4 sm:p-7 sm:pb-5"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Nova integração</p><CardTitle className="mt-2 text-xl tracking-tight">Conectar um parceiro</CardTitle><p className="mt-2 text-sm leading-6 text-muted-foreground">Cadastre o endpoint HTTPS e escolha os eventos que este parceiro poderá trocar.</p></CardHeader>
        <CardContent className="p-6 pt-0 sm:p-7 sm:pt-0">
          <form className="space-y-5" onSubmit={submit}>
            <div className="space-y-2"><Label htmlFor="integration-partner">Parceiro</Label><select id="integration-partner" value={partnerId} onChange={event => setPartnerId(event.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"><option value="">Selecione um parceiro</option>{partnersQuery.data?.map(partner => <option key={partner.id} value={partner.id}>{partner.displayName}</option>)}</select></div>
            <div className="space-y-2"><Label htmlFor="integration-name">Nome da integração</Label><Input id="integration-name" placeholder="Ex.: Plataforma do parceiro" value={name} onChange={event => setName(event.target.value)} required /></div>
            <div className="space-y-2"><Label htmlFor="integration-endpoint">Endpoint HTTPS</Label><Input id="integration-endpoint" type="url" placeholder="https://parceiro.com/webhooks/cupons" value={endpointUrl} onChange={event => setEndpointUrl(event.target.value)} required /><p className="text-[11px] text-muted-foreground">Somente HTTPS é aceito para proteger os eventos em trânsito.</p></div>
            <div className="space-y-2"><Label htmlFor="integration-status">Status inicial</Label><select id="integration-status" value={status} onChange={event => setStatus(event.target.value as "active" | "paused")} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"><option value="active">Ativa — pronta para homologação</option><option value="paused">Pausada — não utilizar ainda</option></select></div>
            <div className="space-y-3"><div><Label>Eventos autorizados</Label><p className="mt-1 text-[11px] text-muted-foreground">O parceiro receberá ou poderá enviar apenas os eventos marcados.</p></div><div className="grid gap-2 sm:grid-cols-2">{eventOptions.map(([event, label]) => <label key={event} className="flex cursor-pointer items-center gap-3 rounded-xl border border-black/[0.06] p-3 transition-colors hover:bg-[#fbfbf8]"><input type="checkbox" checked={selectedEvents.includes(event)} onChange={() => toggleEvent(event)} className="h-4 w-4 accent-[#e7c900]" /><span><span className="block font-mono text-xs font-bold">{event}</span><span className="mt-1 block text-[11px] text-muted-foreground">{label}</span></span></label>)}</div></div>
            <Button type="submit" className="h-11 w-full gap-2 font-bold" disabled={createMutation.isPending}><KeyRound className="h-4 w-4" />{createMutation.isPending ? "Gerando segredo…" : "Criar integração e gerar segredo"}</Button>
          </form>
          {lastSecret && <div className="mt-5 rounded-2xl border border-[#e6cf32] bg-[#fffbea] p-4"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#806b00]" /><div className="min-w-0 flex-1"><p className="text-xs font-bold text-[#5f5100]">Segredo gerado — copie agora</p><p className="mt-1 text-[11px] leading-5 text-[#806b00]">Ele não será mostrado novamente depois que você sair desta tela.</p><div className="mt-3 flex gap-2"><code className="min-w-0 flex-1 overflow-x-auto rounded-lg bg-white px-3 py-2 font-mono text-xs text-foreground">{lastSecret}</code><Button type="button" size="sm" variant="outline" className="shrink-0" onClick={() => { void navigator.clipboard?.writeText(lastSecret); toast.success("Segredo copiado"); }}>Copiar</Button></div></div></div></div>}
        </CardContent>
      </Card>
      <Card className="border-0 shadow-sm shadow-black/[0.04]">
        <CardHeader className="flex flex-row items-start justify-between gap-3 p-6 pb-4 sm:p-7 sm:pb-5"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Integrações cadastradas</p><CardTitle className="mt-2 text-xl tracking-tight">Parceiros conectados</CardTitle></div><Badge className="border-0 bg-[#e2f7eb] text-[#16734b] hover:bg-[#e2f7eb]">{integrationsQuery.data?.length ?? 0} integrações</Badge></CardHeader>
        <CardContent className="space-y-3 p-6 pt-0 sm:p-7 sm:pt-0">{integrationsQuery.data?.length ? integrationsQuery.data.map(integration => <div key={integration.id} className="rounded-2xl border border-black/[0.06] p-4"><div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f1e8ff] text-[#7440ab]"><Webhook className="h-4 w-4" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{integration.name}</p><Badge variant="outline" className="text-[10px]">{integration.status === "active" ? "Ativa" : "Pausada"}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{integration.partnerName}</p><p className="mt-2 truncate font-mono text-[11px] text-muted-foreground">{integration.endpointUrl}</p><div className="mt-3 flex flex-wrap gap-1.5">{integration.allowedEvents.map(event => <span key={event} className="rounded-md bg-[#f7f7f3] px-2 py-1 font-mono text-[10px] text-muted-foreground">{event.replace("coupon.", "")}</span>)}</div></div></div><div className="mt-3 flex items-center justify-between border-t border-black/[0.05] pt-3 text-[11px] text-muted-foreground"><span>Segredo termina em <strong className="font-mono text-foreground">••••{integration.secretLastFour}</strong></span><span className="flex items-center gap-1"><LockKeyhole className="h-3 w-3" /> Não exibido</span></div></div>) : <div className="rounded-2xl border border-dashed border-black/10 p-7 text-center"><Webhook className="mx-auto h-7 w-7 text-muted-foreground/50" /><p className="mt-3 text-sm font-semibold">Nenhuma integração cadastrada</p><p className="mt-1 text-xs text-muted-foreground">A primeira integração aparecerá aqui após a criação.</p></div>}</CardContent>
      </Card>
    </section>
  );
}

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

      <IntegrationManager />

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
