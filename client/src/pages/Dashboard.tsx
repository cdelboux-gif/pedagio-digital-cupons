import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import { Activity, ArrowRight, Building2, CalendarClock, CircleAlert, Plus, TicketPercent } from "lucide-react";
import { useLocation } from "wouter";

const metrics = [
  { key: "partners", label: "Parceiros cadastrados", description: "Base operacional", icon: Building2, tone: "bg-white" },
  { key: "activeCoupons", label: "Cupons ativos", description: "Disponíveis agora", icon: TicketPercent, tone: "bg-[#111418] text-white" },
  { key: "expiringCoupons", label: "Vencem em 7 dias", description: "Acompanhar vigência", icon: CalendarClock, tone: "bg-white" },
  { key: "registeredUses", label: "Usos registrados", description: "Histórico consolidado", icon: Activity, tone: "bg-white" },
] as const;

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const summary = trpc.admin.dashboard.useQuery(undefined, { retry: false });

  if (summary.isError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center rounded-[1.75rem] border border-dashed border-black/10 bg-white p-8 text-center">
        <div className="max-w-sm">
          <CircleAlert className="mx-auto h-8 w-8 text-amber-600" />
          <h1 className="mt-4 text-xl font-extrabold">Não foi possível carregar a operação</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Verifique a conexão com o banco e tente novamente.</p>
          <Button className="mt-6" onClick={() => summary.refetch()}>Tentar novamente</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-7">
      <section className="relative overflow-hidden rounded-[1.75rem] bg-[#111418] px-6 py-7 text-white shadow-[0_18px_50px_rgba(17,20,24,0.14)] sm:px-8 sm:py-9">
        <div className="absolute right-0 top-0 h-36 w-36 translate-x-8 -translate-y-8 rounded-full border-[20px] border-primary/90" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">Visão operacional</p>
            <h1 className="mt-3 max-w-2xl text-3xl font-extrabold tracking-tight sm:text-4xl">Benefícios sob controle, do parceiro ao uso.</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/60">Monitore a disponibilidade dos cupons, mantenha a base de parceiros e acompanhe cada utilização com rastreabilidade.</p>
          </div>
          <Button onClick={() => setLocation("/cupons")} className="h-11 shrink-0 gap-2 px-5 font-bold">
            <Plus className="h-4 w-4" /> Novo cupom
          </Button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(metric => {
          const Icon = metric.icon;
          const value = summary.data?.[metric.key] ?? 0;
          return (
            <div key={metric.key} className={`rounded-2xl border border-black/5 p-5 shadow-[0_6px_20px_rgba(17,20,24,0.03)] ${metric.tone}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className={`text-xs font-semibold ${metric.tone.includes("text-white") ? "text-white/55" : "text-muted-foreground"}`}>{metric.label}</p>
                  {summary.isLoading ? <Skeleton className="mt-3 h-9 w-16" /> : <p className="mt-2 text-3xl font-extrabold tracking-tight">{value.toLocaleString("pt-BR")}</p>}
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${metric.tone.includes("text-white") ? "bg-white/10 text-primary" : "bg-primary/18 text-foreground"}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <p className={`mt-5 text-[11px] font-medium ${metric.tone.includes("text-white") ? "text-white/45" : "text-muted-foreground"}`}>{metric.description}</p>
            </div>
          );
        })}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.45fr_0.9fr]">
        <div className="overflow-hidden rounded-[1.5rem] border border-black/5 bg-white shadow-[0_8px_26px_rgba(17,20,24,0.035)]">
          <div className="flex items-center justify-between border-b border-black/5 px-6 py-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-primary-foreground/70">Rastreabilidade</p>
              <h2 className="mt-1 text-lg font-extrabold tracking-tight">Últimas utilizações</h2>
            </div>
            <Button variant="ghost" className="gap-1.5 text-xs font-bold" onClick={() => setLocation("/utilizacoes")}>
              Ver histórico <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="divide-y divide-black/5">
            {summary.isLoading && Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="mx-6 my-4 h-12" />)}
            {!summary.isLoading && !summary.data?.recentUses.length && (
              <div className="px-6 py-12 text-center">
                <Activity className="mx-auto h-6 w-6 text-primary" />
                <p className="mt-3 text-sm font-bold">Ainda não há utilizações registradas.</p>
                <p className="mt-1 text-xs text-muted-foreground">O histórico aparecerá aqui após o primeiro resgate.</p>
              </div>
            )}
            {summary.data?.recentUses.map(item => (
              <div key={item.id} className="flex items-center gap-4 px-6 py-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary-foreground"><TicketPercent className="h-4 w-4" /></div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{item.couponCode} <span className="font-normal text-muted-foreground">· {item.partnerName}</span></p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Ref. {item.reference} · {formatDateTime(item.usedAt)}</p>
                </div>
                <StatusBadge status="active" label="Confirmado" />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[1.5rem] bg-primary p-6 text-primary-foreground shadow-[0_8px_26px_rgba(246,218,0,0.18)]">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-foreground/60">Prioridade do dia</p>
          <h2 className="mt-3 text-2xl font-extrabold tracking-tight">Revise os cupons próximos do vencimento.</h2>
          <p className="mt-3 text-sm leading-6 text-primary-foreground/70">Acompanhe validade, saldo de usos e status de cada benefício para preservar a disponibilidade da jornada.</p>
          <div className="mt-7 rounded-2xl bg-black/8 p-4">
            <p className="text-3xl font-extrabold">{summary.data?.expiringCoupons ?? 0}</p>
            <p className="mt-1 text-xs font-semibold text-primary-foreground/65">cupons exigem acompanhamento nos próximos 7 dias</p>
          </div>
          <Button variant="outline" className="mt-6 h-10 w-full border-black/15 bg-transparent text-primary-foreground hover:bg-black/8" onClick={() => setLocation("/cupons")}>
            Revisar cupons
          </Button>
        </div>
      </section>
    </div>
  );
}
