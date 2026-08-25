import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Boxes, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type EntityStatus = "active" | "inactive";

export default function Entities() {
  const utils = trpc.useUtils();
  const entities = trpc.admin.entities.list.useQuery(undefined, { retry: false });
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<EntityStatus>("active");
  const [notes, setNotes] = useState("");
  const create = trpc.admin.entities.create.useMutation({
    onSuccess: async () => { await utils.admin.entities.list.invalidate(); toast.success("Entidade criada"); setName(""); setCode(""); setNotes(""); setOpen(false); },
    onError: error => toast.error(error.message),
  });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim() || !code.trim()) return toast.error("Informe nome e código da entidade");
    create.mutate({ name: name.trim(), code: code.trim().toUpperCase(), status, notes: notes.trim() || null });
  }

  return <div className="mx-auto max-w-[1200px] space-y-6">
    <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary-foreground/60">Estrutura</p><h1 className="mt-2 text-3xl font-extrabold tracking-tight">Entidades</h1><p className="mt-2 text-sm text-muted-foreground">Organize grupos empresariais, unidades de negócio ou estruturas administrativas.</p></div><Button onClick={() => setOpen(value => !value)} className="h-11 gap-2 px-5 font-bold"><Plus className="h-4 w-4" /> Nova entidade</Button></header>
    {open && <Card className="border-0 shadow-sm"><CardHeader><CardTitle className="text-xl">Cadastrar entidade</CardTitle></CardHeader><CardContent><form onSubmit={submit} className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>Nome *</Label><Input value={name} onChange={event => setName(event.target.value)} placeholder="Ex.: Operação Sudeste" /></div><div className="space-y-2"><Label>Código *</Label><Input value={code} onChange={event => setCode(event.target.value.toUpperCase())} placeholder="Ex.: SUDESTE" /></div><div className="space-y-2"><Label>Status</Label><Select value={status} onValueChange={value => setStatus(value as EntityStatus)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Ativa</SelectItem><SelectItem value="inactive">Inativa</SelectItem></SelectContent></Select></div><div className="space-y-2 sm:col-span-2"><Label>Observações</Label><Textarea value={notes} onChange={event => setNotes(event.target.value)} className="min-h-20 resize-none" /></div><div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit" disabled={create.isPending}>{create.isPending ? "Salvando…" : "Criar entidade"}</Button></div></form></CardContent></Card>}
    <Card className="border-0 shadow-sm"><CardHeader><CardTitle>Entidades cadastradas</CardTitle></CardHeader><CardContent className="space-y-3">{entities.isLoading ? <p className="text-sm text-muted-foreground">Carregando entidades…</p> : entities.data?.length ? entities.data.map(entity => <div key={entity.id} className="flex flex-col gap-3 rounded-2xl border border-black/6 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff8ce] text-[#6a5a00]"><Boxes className="h-4 w-4" /></div><div><p className="font-extrabold">{entity.name}</p><p className="mt-1 font-mono text-xs text-muted-foreground">{entity.code}</p></div></div><span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${entity.status === "active" ? "bg-[#e2f7eb] text-[#16734b]" : "bg-black/5 text-muted-foreground"}`}>{entity.status === "active" ? "Ativa" : "Inativa"}</span></div>) : <div className="rounded-2xl border border-dashed border-black/10 p-10 text-center text-sm text-muted-foreground">Nenhuma entidade cadastrada.</div>}</CardContent></Card>
  </div>;
}
