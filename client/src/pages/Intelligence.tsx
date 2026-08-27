import { useMemo, useState } from "react";
import { BrainCircuit, MapPin, Pencil, Play, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";

const modeLabel: Record<string, string> = {
  activated_benefit: "Benefício ativado",
  personalized: "Personalizada",
  sponsored: "Patrocinada",
};

export default function Intelligence() {
  const tolls = trpc.admin.tolls.list.useQuery();
  const campaigns = trpc.admin.intelligence.campaigns.list.useQuery();
  const partners = trpc.admin.partners.list.useQuery();
  const [metricsPartnerId, setMetricsPartnerId] = useState("");
  const [metricsStoreId, setMetricsStoreId] = useState("");
  const [metricsTollId, setMetricsTollId] = useState("");
  const [periodDays, setPeriodDays] = useState("30");
  const metricsStoreInput = useMemo(() => metricsPartnerId ? { partnerId: Number(metricsPartnerId) } : undefined, [metricsPartnerId]);
  const stores = trpc.admin.stores.list.useQuery(metricsStoreInput);
  const metricsInput = useMemo(() => {
    const endsAt = new Date();
    const startsAt = new Date(endsAt.getTime() - Number(periodDays) * 24 * 60 * 60 * 1000);
    return { partnerId: metricsPartnerId ? Number(metricsPartnerId) : undefined, storeId: metricsStoreId ? Number(metricsStoreId) : undefined, tollPlazaId: metricsTollId ? Number(metricsTollId) : undefined, startsAt, endsAt };
  }, [metricsPartnerId, metricsStoreId, metricsTollId, periodDays]);
  const metrics = trpc.admin.intelligence.metrics.useQuery(metricsInput);
  const simulate = trpc.admin.intelligence.simulatePassage.useMutation({
    onSuccess: result => {
      toast.success(result.created ? "Passagem simulada e recomendações preparadas" : "Passagem já processada; resultado reutilizado");
      setResult(result);
    },
    onError: error => toast.error(error.message),
  });
  const [userReference, setUserReference] = useState("usuario-demo");
  const [tollPlazaId, setTollPlazaId] = useState("");
  const [consent, setConsent] = useState(true);
  const [result, setResult] = useState<Awaited<ReturnType<typeof simulate.mutateAsync>> | null>(null);
  const activeTolls = useMemo(() => (tolls.data ?? []).filter(item => item.status === "active"), [tolls.data]);
  const [tollForm, setTollForm] = useState({ id: 0, code: "", name: "", highway: "", direction: "", latitude: "", longitude: "", radiusMeters: "250", status: "active" as "active" | "inactive" });
  const tollCreate = trpc.admin.tolls.create.useMutation({ onSuccess: async () => { await tolls.refetch(); toast.success("Ponto de gatilho criado"); setTollForm({ id: 0, code: "", name: "", highway: "", direction: "", latitude: "", longitude: "", radiusMeters: "250", status: "active" }); }, onError: error => toast.error(error.message) });
  const tollUpdate = trpc.admin.tolls.update.useMutation({ onSuccess: async () => { await tolls.refetch(); toast.success("Ponto de gatilho atualizado"); setTollForm({ id: 0, code: "", name: "", highway: "", direction: "", latitude: "", longitude: "", radiusMeters: "250", status: "active" }); }, onError: error => toast.error(error.message) });
  const tollDeactivate = trpc.admin.tolls.deactivate.useMutation({ onSuccess: async () => { await tolls.refetch(); toast.success("Ponto de gatilho desativado"); }, onError: error => toast.error(error.message) });

  function saveToll(event: React.FormEvent) { event.preventDefault(); const payload = { code: tollForm.code.trim().toUpperCase(), name: tollForm.name.trim(), highway: tollForm.highway.trim() || null, direction: tollForm.direction.trim() || null, latitude: Number(tollForm.latitude), longitude: Number(tollForm.longitude), radiusMeters: Number(tollForm.radiusMeters), status: tollForm.status as "active" | "inactive" }; if (!payload.code || !payload.name || !Number.isFinite(payload.latitude) || !Number.isFinite(payload.longitude)) return toast.error("Informe código, nome e coordenadas válidas"); if (tollForm.id) tollUpdate.mutate({ id: tollForm.id, data: payload }); else tollCreate.mutate(payload); }
  function editToll(toll: (typeof activeTolls)[number]) { setTollForm({ id: toll.id, code: toll.code, name: toll.name, highway: toll.highway ?? "", direction: toll.direction ?? "", latitude: String(toll.latitude), longitude: String(toll.longitude), radiusMeters: String(toll.radiusMeters), status: toll.status }); }

  function runSimulation() {
    if (!tollPlazaId) return toast.error("Selecione um pedágio");
    simulate.mutate({ userReference, tollPlazaId: Number(tollPlazaId), occurredAt: new Date(), accuracyMeters: 80, consentPersonalization: consent, source: "backoffice_simulator", payload: { scenario: "mvp" } });
  }

  return (
    <main className="space-y-6 p-6 md:p-8">
      <section className="rounded-3xl bg-[#101418] p-7 text-white md:p-9">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-2xl space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#f4c400]"><BrainCircuit className="size-4" /> Inteligência contextual</div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Ofertas certas no momento da jornada.</h1>
            <p className="text-sm leading-6 text-white/65">Simule uma passagem pelo pedágio e veja como benefícios ativados e recomendações opcionais podem ser preparados sem chamar a IA no caminho crítico.</p>
          </div>
          <Badge className="w-fit border-0 bg-[#f4c400] text-[#101418]">Modo assistido</Badge>
        </div>
      </section>

      <Card className="border-black/5 shadow-sm"><CardHeader><CardTitle className="flex items-center justify-between gap-3"><span className="flex items-center gap-2"><MapPin className="size-5 text-[#b58b00]" /> Pontos de gatilho</span><Badge variant="outline">CRUD operacional</Badge></CardTitle><CardDescription>Cadastre praças com coordenadas e raio para selecionar o gatilho das ofertas e simular passagens.</CardDescription></CardHeader><CardContent className="space-y-5"><form onSubmit={saveToll} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div className="space-y-1"><Label>Código *</Label><Input value={tollForm.code} onChange={event => setTollForm({ ...tollForm, code: event.target.value })} placeholder="SP-330-KM-123" /></div><div className="space-y-1"><Label>Nome *</Label><Input value={tollForm.name} onChange={event => setTollForm({ ...tollForm, name: event.target.value })} placeholder="Praça Norte" /></div><div className="space-y-1"><Label>Rodovia</Label><Input value={tollForm.highway} onChange={event => setTollForm({ ...tollForm, highway: event.target.value })} placeholder="Anhanguera" /></div><div className="space-y-1"><Label>Sentido</Label><Input value={tollForm.direction} onChange={event => setTollForm({ ...tollForm, direction: event.target.value })} placeholder="Capital" /></div><div className="space-y-1"><Label>Latitude *</Label><Input type="number" step="0.000001" value={tollForm.latitude} onChange={event => setTollForm({ ...tollForm, latitude: event.target.value })} placeholder="-23.550520" /></div><div className="space-y-1"><Label>Longitude *</Label><Input type="number" step="0.000001" value={tollForm.longitude} onChange={event => setTollForm({ ...tollForm, longitude: event.target.value })} placeholder="-46.633308" /></div><div className="space-y-1"><Label>Raio (m) *</Label><Input type="number" min="50" max="2000" value={tollForm.radiusMeters} onChange={event => setTollForm({ ...tollForm, radiusMeters: event.target.value })} /></div><div className="flex items-end gap-2"><Button type="submit" disabled={tollCreate.isPending || tollUpdate.isPending} className="gap-2"><Plus className="size-4" />{tollForm.id ? "Salvar ponto" : "Adicionar ponto"}</Button>{tollForm.id > 0 && <Button type="button" variant="outline" onClick={() => setTollForm({ id: 0, code: "", name: "", highway: "", direction: "", latitude: "", longitude: "", radiusMeters: "250", status: "active" })}>Cancelar</Button>}</div></form><div className="grid gap-3 md:grid-cols-2">{(tolls.data ?? []).map(toll => <div key={toll.id} className="flex items-start justify-between gap-3 rounded-xl border border-border/60 p-4"><div><div className="flex flex-wrap items-center gap-2"><span className="font-medium">{toll.name}</span><Badge variant={toll.status === "active" ? "default" : "outline"}>{toll.status === "active" ? "Ativo" : "Inativo"}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{toll.code} · {toll.highway || "Rodovia não informada"} · raio {toll.radiusMeters} m</p><p className="mt-1 text-xs text-muted-foreground">{Number(toll.latitude).toFixed(6)}, {Number(toll.longitude).toFixed(6)}</p></div><div className="flex shrink-0 gap-1"><Button size="icon" variant="ghost" aria-label={`Editar ${toll.name}`} onClick={() => editToll(toll)}><Pencil className="size-4" /></Button>{toll.status === "active" && <Button size="icon" variant="ghost" aria-label={`Desativar ${toll.name}`} onClick={() => tollDeactivate.mutate({ id: toll.id })}><Trash2 className="size-4 text-rose-600" /></Button>}</div></div>)}</div></CardContent></Card>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="border-black/5 shadow-sm">
          <CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="size-5 text-[#b58b00]" /> Simulador de passagem</CardTitle><CardDescription>O teste não envia notificações nem altera dados de usuários.</CardDescription></CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2"><Label htmlFor="userReference">Referência do usuário</Label><Input id="userReference" value={userReference} onChange={event => setUserReference(event.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="toll">Pedágio</Label><select id="toll" value={tollPlazaId} onChange={event => setTollPlazaId(event.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Selecione um pedágio</option>{activeTolls.map(toll => <option key={toll.id} value={toll.id}>{toll.name} · {toll.code}</option>)}</select></div>
            <label className="flex items-start gap-3 rounded-xl bg-muted/45 p-3 text-sm"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} className="mt-1" /><span><strong>Permitir personalização</strong><br /><span className="text-muted-foreground">Sem consentimento, apenas benefícios contextuais e ofertas elegíveis entram no resultado.</span></span></label>
            <Button onClick={runSimulation} disabled={simulate.isPending || !activeTolls.length} className="w-full bg-[#f4c400] text-[#101418] hover:bg-[#e2b600]"><Play className="mr-2 size-4" />{simulate.isPending ? "Processando…" : "Simular passagem"}</Button>
            {!activeTolls.length && <p className="text-xs text-muted-foreground">Cadastre ao menos um pedágio ativo para iniciar a simulação.</p>}
          </CardContent>
        </Card>

        <Card className="border-black/5 shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="size-5 text-[#b58b00]" /> Resultado preparado</CardTitle><CardDescription>Ranking determinístico com componente comercial limitado.</CardDescription></CardHeader><CardContent>{result ? <div className="space-y-3">{result.recommendations.length ? result.recommendations.map(item => <div key={item.id} className="flex items-start justify-between gap-4 rounded-xl border border-border/60 p-4"><div><div className="flex flex-wrap items-center gap-2"><span className="font-medium">Cupom #{item.couponId}</span><Badge variant="outline">{modeLabel[item.mode] ?? item.mode}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{item.explanation}</p></div><span className="text-sm font-semibold">{Number(item.score).toFixed(2)}</span></div>) : <div className="rounded-xl bg-muted/40 p-5 text-sm text-muted-foreground">Nenhuma recomendação elegível para este cenário.</div>}<p className="pt-2 text-xs text-muted-foreground">Evento: {result.event.id} · {result.created ? "novo" : "idempotente"}</p></div> : <div className="flex min-h-48 flex-col items-center justify-center rounded-xl bg-muted/35 p-6 text-center"><Sparkles className="mb-3 size-7 text-[#b58b00]" /><p className="text-sm text-muted-foreground">Escolha um pedágio para visualizar os benefícios e recomendações preparados.</p></div>}</CardContent></Card>
      </div>

      <Card className="border-black/5 shadow-sm"><CardHeader><CardTitle>Insights do motor</CardTitle><CardDescription>Eventos operacionais agregados; simulações não entram nesta leitura.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="grid gap-3 md:grid-cols-4"><select aria-label="Parceiro dos insights" value={metricsPartnerId} onChange={event => { setMetricsPartnerId(event.target.value); setMetricsStoreId(""); }} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Todos os parceiros</option>{(partners.data ?? []).map(partner => <option key={partner.id} value={partner.id}>{partner.displayName}</option>)}</select><select aria-label="Loja dos insights" value={metricsStoreId} onChange={event => setMetricsStoreId(event.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Todas as lojas</option>{(stores.data ?? []).map(item => <option key={item.store.id} value={item.store.id}>{item.store.name}</option>)}</select><select aria-label="Pedágio dos insights" value={metricsTollId} onChange={event => setMetricsTollId(event.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Todos os pedágios</option>{activeTolls.map(toll => <option key={toll.id} value={toll.id}>{toll.name}</option>)}</select><select aria-label="Período dos insights" value={periodDays} onChange={event => setPeriodDays(event.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option><option value="90">Últimos 90 dias</option></select></div>{metrics.isError ? <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">Não foi possível carregar os insights para este recorte.</p> : metrics.isLoading ? <p className="text-sm text-muted-foreground">Calculando indicadores…</p> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{["impression", "click", "dismiss", "activate", "redeem"].map(eventName => { const total = (metrics.data ?? []).filter(item => item.eventName === eventName).reduce((sum, item) => sum + Number(item.total), 0); return <div key={eventName} className="rounded-xl bg-muted/40 p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">{eventName}</p><p className="mt-1 text-2xl font-semibold">{total}</p></div>; })}</div>}</CardContent></Card>

      <Card className="border-black/5 shadow-sm"><CardHeader><CardTitle>Campanhas ativas no motor</CardTitle><CardDescription>As campanhas patrocinadas nunca bypassam elegibilidade, validade ou escopo.</CardDescription></CardHeader><CardContent>{campaigns.isLoading ? <p className="text-sm text-muted-foreground">Carregando campanhas…</p> : campaigns.data?.length ? <div className="grid gap-3 md:grid-cols-2">{campaigns.data.map(campaign => <div key={campaign.id} className="rounded-xl border border-border/60 p-4"><div className="flex items-center justify-between gap-3"><span className="font-medium">{campaign.name}</span><Badge variant={campaign.mode === "sponsored" ? "secondary" : "outline"}>{modeLabel[campaign.mode]}</Badge></div><p className="mt-1 text-xs text-muted-foreground">Cupom #{campaign.couponId} · Pedágio {campaign.tollPlazaId ?? "qualquer"}</p></div>)}</div> : <div className="rounded-xl bg-muted/40 p-5 text-sm text-muted-foreground">Ainda não existem campanhas cadastradas.</div>}</CardContent></Card>
    </main>
  );
}
