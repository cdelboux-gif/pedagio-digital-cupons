import { useMemo, useState } from "react";
import { BrainCircuit, MapPin, Play, Sparkles } from "lucide-react";
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

      <Card className="border-black/5 shadow-sm"><CardHeader><CardTitle>Campanhas ativas no motor</CardTitle><CardDescription>As campanhas patrocinadas nunca bypassam elegibilidade, validade ou escopo.</CardDescription></CardHeader><CardContent>{campaigns.isLoading ? <p className="text-sm text-muted-foreground">Carregando campanhas…</p> : campaigns.data?.length ? <div className="grid gap-3 md:grid-cols-2">{campaigns.data.map(campaign => <div key={campaign.id} className="rounded-xl border border-border/60 p-4"><div className="flex items-center justify-between gap-3"><span className="font-medium">{campaign.name}</span><Badge variant={campaign.mode === "sponsored" ? "secondary" : "outline"}>{modeLabel[campaign.mode]}</Badge></div><p className="mt-1 text-xs text-muted-foreground">Cupom #{campaign.couponId} · Pedágio {campaign.tollPlazaId ?? "qualquer"}</p></div>)}</div> : <div className="rounded-xl bg-muted/40 p-5 text-sm text-muted-foreground">Ainda não existem campanhas cadastradas.</div>}</CardContent></Card>
    </main>
  );
}
