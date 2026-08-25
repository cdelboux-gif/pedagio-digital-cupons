import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { emptyToNull } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import { Building2, Edit3, Mail, Phone, Plus, Search, SlidersHorizontal, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type PartnerStatus = "prospect" | "active" | "inactive" | "blocked";
type PartnerRecord = {
  id: number;
  displayName: string;
  legalName: string | null;
  taxId: string | null;
  category: string | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  relationshipStatus: PartnerStatus;
  notes: string | null;
};

type PartnerForm = Omit<PartnerRecord, "id">;
const emptyForm: PartnerForm = {
  displayName: "", legalName: "", taxId: "", category: "", contactName: "", email: "", phone: "", relationshipStatus: "prospect", notes: "",
};

const statusOptions: Array<{ value: PartnerStatus; label: string }> = [
  { value: "prospect", label: "Prospecção" },
  { value: "active", label: "Ativo" },
  { value: "inactive", label: "Inativo" },
  { value: "blocked", label: "Bloqueado" },
];

export default function Partners() {
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<PartnerStatus | "all">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<PartnerForm>(emptyForm);
  const filters = useMemo(() => ({ search: search || undefined, status: status === "all" ? undefined : status }), [search, status]);
  const partners = trpc.admin.partners.list.useQuery(filters, { retry: false });
  const createPartner = trpc.admin.partners.create.useMutation({ onSuccess: async () => { await utils.admin.partners.list.invalidate(); toast.success("Parceiro cadastrado com sucesso"); closeDialog(); }, onError: error => toast.error(error.message) });
  const updatePartner = trpc.admin.partners.update.useMutation({ onSuccess: async () => { await utils.admin.partners.list.invalidate(); toast.success("Dados do parceiro atualizados"); closeDialog(); }, onError: error => toast.error(error.message) });

  function closeDialog() {
    setDialogOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(partner: PartnerRecord) {
    setEditingId(partner.id);
    setForm({ ...partner });
    setDialogOpen(true);
  }

  function savePartner() {
    const data = {
      displayName: form.displayName.trim(),
      legalName: emptyToNull(form.legalName ?? ""),
      taxId: emptyToNull(form.taxId ?? ""),
      category: emptyToNull(form.category ?? ""),
      contactName: emptyToNull(form.contactName ?? ""),
      email: emptyToNull(form.email ?? ""),
      phone: emptyToNull(form.phone ?? ""),
      relationshipStatus: form.relationshipStatus,
      notes: emptyToNull(form.notes ?? ""),
    };
    if (!data.displayName) return toast.error("Informe o nome comercial do parceiro");
    if (editingId) updatePartner.mutate({ id: editingId, data }); else createPartner.mutate(data);
  }

  const isSaving = createPartner.isPending || updatePartner.isPending;
  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary-foreground/60">Relacionamento</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Parceiros</h1>
          <p className="mt-2 text-sm text-muted-foreground">Mantenha os dados comerciais, contatos e o status de cada relacionamento.</p>
        </div>
        <Button onClick={openCreate} className="h-11 gap-2 px-5 font-bold"><Plus className="h-4 w-4" /> Novo parceiro</Button>
      </header>

      <section className="flex flex-col gap-3 rounded-2xl border border-black/5 bg-white p-4 shadow-[0_6px_20px_rgba(17,20,24,0.025)] lg:flex-row lg:items-center">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={event => setSearch(event.target.value)} className="h-10 border-black/7 bg-[#fafaf7] pl-9" placeholder="Buscar por parceiro, contato ou e-mail" /></div>
        <div className="flex items-center gap-2"><SlidersHorizontal className="h-4 w-4 text-muted-foreground" /><Select value={status} onValueChange={value => setStatus(value as PartnerStatus | "all")}><SelectTrigger className="h-10 w-[172px] border-black/7 bg-[#fafaf7]"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">Todos os status</SelectItem>{statusOptions.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></div>
      </section>

      <section className="overflow-hidden rounded-[1.5rem] border border-black/5 bg-white shadow-[0_8px_26px_rgba(17,20,24,0.035)]">
        <div className="hidden grid-cols-[minmax(230px,1.45fr)_1fr_0.8fr_140px_56px] gap-4 border-b border-black/5 px-6 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground lg:grid"><span>Parceiro</span><span>Contato</span><span>Categoria</span><span>Status</span><span /></div>
        {partners.isLoading && <div className="p-8 text-sm text-muted-foreground">Carregando parceiros…</div>}
        {partners.isError && <div className="p-8 text-sm text-rose-700">Não foi possível carregar os parceiros. Tente novamente.</div>}
        {!partners.isLoading && !partners.isError && partners.data?.length === 0 && <EmptyPartners onCreate={openCreate} />}
        <div className="divide-y divide-black/5">
          {partners.data?.map(partner => (
            <div key={partner.id} className="grid gap-4 px-5 py-5 lg:grid-cols-[minmax(230px,1.45fr)_1fr_0.8fr_140px_56px] lg:items-center lg:px-6">
              <div className="min-w-0"><div className="flex items-center gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/18 text-primary-foreground"><Building2 className="h-4 w-4" /></div><div className="min-w-0"><p className="truncate text-sm font-extrabold">{partner.displayName}</p><p className="truncate text-xs text-muted-foreground">{partner.legalName || "Sem razão social cadastrada"}</p></div></div></div>
              <div className="space-y-1 text-xs text-muted-foreground"><p className="flex items-center gap-1.5 truncate"><Mail className="h-3.5 w-3.5" /> {partner.email || "E-mail não informado"}</p><p className="flex items-center gap-1.5 truncate"><Phone className="h-3.5 w-3.5" /> {partner.contactName || partner.phone || "Contato não informado"}</p></div>
              <p className="text-xs font-semibold text-foreground/75">{partner.category || "Sem categoria"}</p>
              <div><StatusBadge status={partner.relationshipStatus} /></div>
              <Button variant="ghost" size="icon" className="h-9 w-9 justify-self-end rounded-xl" onClick={() => openEdit(partner)} aria-label={`Editar ${partner.displayName}`}><Edit3 className="h-4 w-4" /></Button>
            </div>
          ))}
        </div>
      </section>

      <Dialog open={dialogOpen} onOpenChange={open => !open && closeDialog()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{editingId ? "Editar parceiro" : "Novo parceiro"}</DialogTitle><DialogDescription>Cadastre os dados essenciais para manter o relacionamento operacional atualizado.</DialogDescription></DialogHeader>
          <div className="grid gap-5 py-3 sm:grid-cols-2">
            <Field label="Nome comercial *"><Input value={form.displayName} onChange={event => setForm({ ...form, displayName: event.target.value })} placeholder="Ex.: Posto Horizonte" /></Field>
            <Field label="Razão social"><Input value={form.legalName ?? ""} onChange={event => setForm({ ...form, legalName: event.target.value })} /></Field>
            <Field label="Categoria"><Input value={form.category ?? ""} onChange={event => setForm({ ...form, category: event.target.value })} placeholder="Ex.: Alimentação" /></Field>
            <Field label="Status do relacionamento"><Select value={form.relationshipStatus} onValueChange={value => setForm({ ...form, relationshipStatus: value as PartnerStatus })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{statusOptions.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></Field>
            <Field label="Responsável de contato"><Input value={form.contactName ?? ""} onChange={event => setForm({ ...form, contactName: event.target.value })} /></Field>
            <Field label="Telefone"><Input value={form.phone ?? ""} onChange={event => setForm({ ...form, phone: event.target.value })} /></Field>
            <Field label="E-mail" className="sm:col-span-2"><Input type="email" value={form.email ?? ""} onChange={event => setForm({ ...form, email: event.target.value })} /></Field>
            <Field label="CNPJ / documento" className="sm:col-span-2"><Input value={form.taxId ?? ""} onChange={event => setForm({ ...form, taxId: event.target.value })} /></Field>
            <Field label="Observações" className="sm:col-span-2"><Textarea value={form.notes ?? ""} onChange={event => setForm({ ...form, notes: event.target.value })} className="min-h-24 resize-none" placeholder="Informações relevantes para a operação" /></Field>
          </div>
          <DialogFooter><Button variant="outline" onClick={closeDialog}>Cancelar</Button><Button onClick={savePartner} disabled={isSaving}>{isSaving ? "Salvando…" : editingId ? "Salvar alterações" : "Cadastrar parceiro"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) { return <div className={`space-y-2 ${className}`}><Label className="text-xs font-bold">{label}</Label>{children}</div>; }
function EmptyPartners({ onCreate }: { onCreate: () => void }) { return <div className="px-6 py-16 text-center"><UsersRound className="mx-auto h-7 w-7 text-primary" /><h2 className="mt-4 text-base font-extrabold">A base de parceiros está vazia.</h2><p className="mt-1 text-sm text-muted-foreground">Cadastre o primeiro parceiro para começar a criar benefícios.</p><Button variant="outline" onClick={onCreate} className="mt-5 gap-2"><Plus className="h-4 w-4" /> Cadastrar parceiro</Button></div>; }
