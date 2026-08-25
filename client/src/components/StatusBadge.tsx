import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const labels: Record<string, string> = {
  prospect: "Prospecção",
  active: "Ativo",
  inactive: "Inativo",
  blocked: "Bloqueado",
  draft: "Rascunho",
  paused: "Pausado",
  ended: "Encerrado",
};

const styles: Record<string, string> = {
  prospect: "bg-amber-50 text-amber-800 ring-amber-200",
  active: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  inactive: "bg-slate-100 text-slate-600 ring-slate-200",
  blocked: "bg-rose-50 text-rose-800 ring-rose-200",
  draft: "bg-slate-100 text-slate-600 ring-slate-200",
  paused: "bg-orange-50 text-orange-800 ring-orange-200",
  ended: "bg-slate-100 text-slate-600 ring-slate-200",
  expiring: "bg-amber-50 text-amber-800 ring-amber-200",
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn("border-0 px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset", styles[status] ?? styles.inactive)}
    >
      {label ?? labels[status] ?? status}
    </Badge>
  );
}
