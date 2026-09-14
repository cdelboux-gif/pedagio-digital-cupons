import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { dateInputValue, formatDate } from "@/lib/format";
import { usePermissions } from "@/_core/hooks/useAuth";
import { Activity, CalendarRange, Gauge, MapPin, Megaphone, Play, Plus, Route, Target, TicketPercent, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type CampaignStatus = "draft" | "active" | "paused" | "ended";
type CampaignMode = "activated_benefit" | "personalized" | "sponsored";

type CampaignForm = {
  name: string;
  partnerId: string;
  storeId: string;
  couponId: string;
  tollPlazaId: string;
  mode: CampaignMode;
  sponsorshipLabel: string;
  startsAt: string;
  endsAt: string;
  budgetLimit: string;
  bidAmount: string;
  frequencyCap: string;
  status: CampaignStatus;
};

const today = new Date();
const nextMonth = new Date(today);
nextMonth.setDate(nextMonth.getDate() + 30);

const defaultForm: CampaignForm = {
  name: "",
  partnerId: "",
  storeId: "",
  couponId: "",
  tollPlazaId: "",
  mode: "activated_benefit",
  sponsorshipLabel: "",
  startsAt: dateInputValue(today),
  endsAt: dateInputValue(nextMonth),
  budgetLimit: "",
  bidAmount: "",
  frequencyCap: "1",
  status: "draft",
};

const statusLabels: Record<CampaignStatus, string> = {
  draft: "Rascunho",
  active: "Ativa",
  paused: "Pausada",
  ended: "Encerrada",
};

const modeLabels: Record<CampaignMode, string> = {
  activated_benefit: "Benefício contextual",
  personalized: "Personalizada",
  sponsored: "Patrocinada",
};

export default function Campaigns() {
  const { can } = usePermissions();
  const utils = trpc.useUtils();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<CampaignForm>(defaultForm);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<CampaignStatus | "all">("all");
  const [simulateUser, setSimulateUser] = useState("piloto-frango-assado-001");
  const [simulateToll, setSimulateToll] = useState("");
  const [simulation, setSimulation] = useState<any>(null);

  const campaigns = trpc.admin.intelligence.campaigns.list.useQuery(undefined, { retry: false });
  const partners = trpc.admin.partners.list.useQuery(undefined, { retry: false });
  const coupons = trpc.admin.coupons.list.useQuery(undefined, { retry: false });
  const tolls = trpc.admin.tolls.list.useQuery(undefined, { retry: false });
  const stores = trpc.admin.stores.list.useQuery(form.partnerId ? { partnerId: Number(form.partnerId) } : undefined, { retry: false });

  const createCampaign = trpc.admin.intelligence.campaigns.create.useMutation({
    onSuccess: async () => {
      await campaigns.refetch();
      toast.success("Campanha criada com sucesso");
      setCreateOpen(false);
      setForm(defaultForm);
    },
    onError: error => toast.error(error.message),
  });

  const simulatePassage = trpc.admin.intelligence.simulatePassage.useMutation({
    onSuccess: data => {
      setSimulation(data);
      toast.success(data.recommendations?.length ? "Passagem simulada e oferta gerada" : "Passagem simulada sem oferta elegível");
    },
    onError: error => toast.error(error.message),
  });

  const partnerCoupons = useMemo(() => {
    if (!form.partnerId) return [];
    return coupons.data?.filter(coupon => coupon.partnerId === Number(form.partnerId)) ?? [];
  }, [coupons.data, form.partnerId]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (campaigns.data ?? []).filter(campaign => {
      if (status !== "all" && campaign.status !== status) return false;
      if (!term) return true;
      return [campaign.name, campaign.sponsorshipLabel, String(campaign.id)].some(value => String(value ?? "").toLowerCase().includes(term));
    });
  }, [campaigns.data, search, status]);

  const activeCount = campaigns.data?.filter(item => item.status === "active").length ?? 0;
  const draftCount = campaigns.data?.filter(item => item.status === "draft").length ?? 0;
  const sponsoredCount = campaigns.data?.filter(item => item.mode === "sponsored").length ?? 0;

  function openCreate() {
    const firstPartnerId = partners.data?.[0]?.id?.toString() ?? "";
    setForm({ ...defaultForm, partnerId: firstPartnerId });
    setCreateOpen(true);
  }

  function saveCampaign() {
    if (!form.name.trim() || !form.partnerId || !form.couponId || !form.startsAt || !form.endsAt) {
      return toast.error("Preencha nome, parceiro, benefício e vigência");
    }
    const startsAt = new Date(`${form.startsAt}T00:00:00`);
    const endsAt = new Date(`${form.endsAt}T23:59:59`);
    if (endsAt <= startsAt) return toast.error("A data final deve ser posterior ao início");

    createCampaign.mutate({
      name: form.name.trim(),
      partnerId: Number(form.partnerId),
      storeId: form.storeId ? Number(form.storeId) : null,
      couponId: Number(form.couponId),
      tollPlazaId: form.tollPlazaId ? Number(form.tollPlazaId) : null,
      mode: form.mode,
      sponsorshipLabel: form.sponsorshipLabel.trim() || null,
      startsAt,
      endsAt,
      budgetLimit: form.budgetLimit ? Number(form.budgetLimit) : null,
      bidAmount: form.bidAmount ? Number(form.bidAmount) : null,
      frequencyCap: Number(form.frequencyCap || 1),
      status: form.status,
    });
  }

  function runSimulation() {
    if (!simulateUser.trim() || !simulateToll) return toast.error("Informe usuário de teste e ponto de gatilho");
    simulatePassage.mutate({
      userReference: simulateUser.trim(),
      tollPlazaId: Number(simulateToll),
      occurredAt: new Date(),
      accuracyMeters: 15,
      consentPersonalization: true,
      source: "backoffice_simulator",
      payload: { pilot: "frango_assado", channel: "campaigns_module" },
    });
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary-foreground/60">Road Commerce</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Campanhas</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Orquestre quem recebe cada benefício, em qual trecho, momento e contexto da jornada — e valide o fluxo antes de colocar uma campanha em produção.</p>
        </div>
        {can("campaigns", "create") && <Button onClick={openCreate} className="h-11 gap-2 px-5 font-bold"><Plus className="h-4 w-4" /> Nova campanha</Button>}
      </header>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Megaphone} label="Campanhas" value={campaigns.data?.length ?? 0} helper="Total configurado" />
        <MetricCard icon={Activity} label="Ativas" value={activeCount} helper="Em distribuição" />
        <MetricCard icon={CalendarRange} label="Rascunhos" value={draftCount} helper="Aguardando ativação" />
        <MetricCard icon={Target} label="Patrocinadas" value={sponsoredCount} helper="Com mídia/comercial" />
      </section>

      <Tabs defaultValue="campaigns" className="space-y-5">
        <TabsList className="h-11 rounded-xl bg-black/[0.04] p-1">
          <TabsTrigger value="campaigns" className="rounded-lg px-4 font-bold">Campanhas</TabsTrigger>
          <TabsTrigger value="simulator" className="rounded-lg px-4 font-bold">Simulador de jornada</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-4">
          <section className="grid gap-3 rounded-2xl border border-black/5 bg-white p-4 shadow-[0_6px_20px_rgba(17,20,24,0.025)] md:grid-cols-[1fr_220px]">
            <Input value={search} onChange={event => setSearch(event.target.value)} className="h-10 border-black/7 bg-[#fafaf7]" placeholder="Buscar campanha" />
            <Select value={status} onValueChange={value => setStatus(value as CampaignStatus | "all")}>
              <SelectTrigger className="h-10 border-black/7 bg-[#fafaf7]"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">Todos os status</SelectItem>{Object.entries(statusLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
            </Select>
          </section>

          <section className="overflow-hidden rounded-[1.5rem] border border-black/5 bg-white shadow-[0_8px_26px_rgba(17,20,24,0.035)]">
            <div className="hidden grid-cols-[1.3fr_1fr_0.9fr_0.85fr_0.65fr] gap-4 border-b border-black/5 px-6 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground xl:grid"><span>Campanha</span><span>Oferta</span><span>Vigência</span><span>Gatilho</span><span>Status</span></div>
            {campaigns.isLoading && <div className="p-8 text-sm text-muted-foreground">Carregando campanhas…</div>}
            {campaigns.isError && <div className="p-8 text-sm text-rose-700">Não foi possível carregar as campanhas.</div>}
            {!campaigns.isLoading && filtered.length === 0 && <div className="p-10 text-center"><Megaphone className="mx-auto h-8 w-8 text-muted-foreground/40" /><p className="mt-3 text-sm font-extrabold">Nenhuma campanha encontrada</p><p className="mt-1 text-xs text-muted-foreground">Crie a primeira campanha contextual para iniciar o piloto.</p></div>}
            <div className="divide-y divide-black/5">{filtered.map(campaign => {
              const partner = partners.data?.find(item => item.id === campaign.partnerId);
              const coupon = coupons.data?.find(item => item.id === campaign.couponId);
              const toll = tolls.data?.find(item => item.id === campaign.tollPlazaId);
              return <div key={campaign.id} className="grid gap-4 px-5 py-5 xl:grid-cols-[1.3fr_1fr_0.9fr_0.85fr_0.65fr] xl:items-center xl:px-6">
                <div className="min-w-0"><p className="truncate text-sm font-extrabold">{campaign.name}</p><p className="mt-1 truncate text-xs text-muted-foreground">{partner?.displayName ?? `Parceiro #${campaign.partnerId}`} · {modeLabels[campaign.mode as CampaignMode]}</p></div>
                <div className="min-w-0"><p className="truncate text-sm font-bold">{coupon?.title ?? `Cupom #${campaign.couponId}`}</p><p className="mt-1 truncate text-xs text-muted-foreground">{coupon?.benefit ?? campaign.sponsorshipLabel ?? "Benefício vinculado"}</p></div>
                <div><p className="text-xs font-bold">{formatDate(campaign.startsAt)}</p><p className="mt-1 text-xs text-muted-foreground">até {formatDate(campaign.endsAt)}</p></div>
                <div className="flex items-center gap-2 text-xs"><MapPin className="h-3.5 w-3.5 text-muted-foreground" /><span className="truncate">{toll?.name ?? "Qualquer ponto elegível"}</span></div>
                <CampaignStatusBadge status={campaign.status as CampaignStatus} />
              </div>;
            })}</div>
          </section>
        </TabsContent>

        <TabsContent value="simulator" className="space-y-5">
          <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[1.5rem] border border-black/5 bg-white p-6 shadow-[0_8px_26px_rgba(17,20,24,0.035)]">
              <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#111418] text-primary"><Route className="h-5 w-5" /></div><div><h2 className="text-lg font-extrabold">Simular passagem</h2><p className="text-xs text-muted-foreground">Teste o motor contextual antes de integrar uma passagem real.</p></div></div>
              <div className="mt-6 space-y-4"><Field label="Usuário de teste"><Input value={simulateUser} onChange={event => setSimulateUser(event.target.value)} /></Field><Field label="Ponto de gatilho"><Select value={simulateToll} onValueChange={setSimulateToll}><SelectTrigger><SelectValue placeholder="Selecione um pedágio/ponto" /></SelectTrigger><SelectContent>{tolls.data?.filter(item => item.status === "active").map(item => <SelectItem key={item.id} value={item.id.toString()}>{item.name}{item.highway ? ` · ${item.highway}` : ""}</SelectItem>)}</SelectContent></Select></Field><Button onClick={runSimulation} disabled={simulatePassage.isPending} className="h-11 w-full gap-2 font-bold"><Play className="h-4 w-4" /> {simulatePassage.isPending ? "Simulando…" : "Simular jornada"}</Button></div>
            </div>

            <div className="rounded-[1.5rem] border border-black/5 bg-[#111418] p-6 text-white shadow-[0_8px_26px_rgba(17,20,24,0.08)]">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Resultado</p>
              {!simulation ? <div className="flex min-h-64 flex-col items-center justify-center text-center"><Gauge className="h-9 w-9 text-white/25" /><p className="mt-4 text-sm font-bold text-white/80">Nenhuma simulação executada</p><p className="mt-1 max-w-sm text-xs leading-5 text-white/45">Selecione um ponto e rode a jornada para visualizar as ofertas elegíveis geradas pelo motor.</p></div> : <div className="mt-5 space-y-4"><div className="grid grid-cols-2 gap-3"><DarkMetric label="Evento" value={`#${simulation.event?.id ?? "—"}`} /><DarkMetric label="Ofertas" value={simulation.recommendations?.length ?? 0} /></div>{simulation.recommendations?.length ? simulation.recommendations.map((item: any) => <div key={item.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold text-primary">Entitlement / recomendação #{item.id}</p><p className="mt-1 text-sm font-extrabold">Campanha #{item.campaignId}</p></div><TicketPercent className="h-5 w-5 text-white/40" /></div><p className="mt-3 text-xs leading-5 text-white/55">{item.explanation}</p><div className="mt-3 flex gap-4 text-[11px] text-white/45"><span>Score {item.score}</span><span>Status {item.status}</span></div></div>) : <div className="rounded-2xl border border-amber-300/20 bg-amber-300/5 p-4 text-sm text-amber-100">Nenhuma campanha elegível para este evento. Revise vigência, gatilho, cupom e status da campanha.</div>}</div>}
            </div>
          </section>
        </TabsContent>
      </Tabs>

      <Dialog open={createOpen} onOpenChange={open => !open && setCreateOpen(false)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader><DialogTitle>Nova campanha</DialogTitle><DialogDescription>Defina o parceiro, benefício, gatilho de jornada, frequência e vigência. O cupom continua sendo a regra econômica; a campanha controla a distribuição.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-3 sm:grid-cols-2">
            <Field label="Nome da campanha *" className="sm:col-span-2"><Input value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="Ex.: Frango Assado · Anhanguera · Café" /></Field>
            <Field label="Parceiro *"><Select value={form.partnerId} onValueChange={value => setForm({ ...form, partnerId: value, storeId: "", couponId: "" })}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{partners.data?.map(item => <SelectItem key={item.id} value={item.id.toString()}>{item.displayName}</SelectItem>)}</SelectContent></Select></Field>
            <Field label="Unidade"><Select value={form.storeId || "all"} onValueChange={value => setForm({ ...form, storeId: value === "all" ? "" : value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas / definida pelo motor</SelectItem>{stores.data?.map(({ store }) => <SelectItem key={store.id} value={store.id.toString()}>{store.name}</SelectItem>)}</SelectContent></Select></Field>
            <Field label="Benefício / cupom *" className="sm:col-span-2"><Select value={form.couponId} onValueChange={value => setForm({ ...form, couponId: value })}><SelectTrigger><SelectValue placeholder="Selecione o benefício" /></SelectTrigger><SelectContent>{partnerCoupons.map(item => <SelectItem key={item.id} value={item.id.toString()}>{item.code} · {item.title}</SelectItem>)}</SelectContent></Select></Field>
            <Field label="Gatilho de jornada"><Select value={form.tollPlazaId || "all"} onValueChange={value => setForm({ ...form, tollPlazaId: value === "all" ? "" : value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Qualquer ponto elegível</SelectItem>{tolls.data?.filter(item => item.status === "active").map(item => <SelectItem key={item.id} value={item.id.toString()}>{item.name}{item.highway ? ` · ${item.highway}` : ""}</SelectItem>)}</SelectContent></Select></Field>
            <Field label="Modo"><Select value={form.mode} onValueChange={value => setForm({ ...form, mode: value as CampaignMode })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(modeLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></Field>
            <Field label="Início *"><Input type="date" value={form.startsAt} onChange={event => setForm({ ...form, startsAt: event.target.value })} /></Field>
            <Field label="Fim *"><Input type="date" value={form.endsAt} onChange={event => setForm({ ...form, endsAt: event.target.value })} /></Field>
            <Field label="Frequência máxima"><Input type="number" min="1" max="100" value={form.frequencyCap} onChange={event => setForm({ ...form, frequencyCap: event.target.value })} /></Field>
            <Field label="Status"><Select value={form.status} onValueChange={value => setForm({ ...form, status: value as CampaignStatus })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(statusLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></Field>
            <Field label="Orçamento limite"><Input type="number" min="0" step="0.01" value={form.budgetLimit} onChange={event => setForm({ ...form, budgetLimit: event.target.value })} placeholder="Opcional" /></Field>
            <Field label="Valor de mídia / bid"><Input type="number" min="0" step="0.0001" value={form.bidAmount} onChange={event => setForm({ ...form, bidAmount: event.target.value })} placeholder="Opcional" /></Field>
            <Field label="Identificação patrocinada" className="sm:col-span-2"><Input value={form.sponsorshipLabel} onChange={event => setForm({ ...form, sponsorshipLabel: event.target.value })} placeholder="Ex.: Oferta patrocinada por Frango Assado" /></Field>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button><Button onClick={saveCampaign} disabled={createCampaign.isPending}>{createCampaign.isPending ? "Criando…" : "Criar campanha"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, helper }: { icon: typeof Megaphone; label: string; value: string | number; helper: string }) {
  return <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-[0_6px_20px_rgba(17,20,24,0.025)]"><div className="flex items-center justify-between"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#111418] text-primary"><Icon className="h-4 w-4" /></div><p className="text-2xl font-extrabold tracking-tight">{value}</p></div><p className="mt-4 text-xs font-extrabold">{label}</p><p className="mt-1 text-[11px] text-muted-foreground">{helper}</p></div>;
}

function DarkMetric({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/35">{label}</p><p className="mt-2 text-xl font-extrabold">{value}</p></div>;
}

function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  const styles = status === "active" ? "bg-emerald-50 text-emerald-700" : status === "paused" ? "bg-amber-50 text-amber-700" : status === "ended" ? "bg-slate-100 text-slate-600" : "bg-blue-50 text-blue-700";
  return <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide ${styles}`}>{statusLabels[status]}</span>;
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return <div className={`space-y-2 ${className}`}><Label className="text-xs font-bold">{label}</Label>{children}</div>;
}
