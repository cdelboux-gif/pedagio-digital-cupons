import { PartnerLocationMap } from "@/components/PartnerLocationMap";
import { StatusBadge } from "@/components/StatusBadge";
import { ImageUploadField, type ImageUploadValue } from "@/components/ImageUploadField";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { emptyToNull } from "@/lib/format";
import { buildPartnerGpsUrl, formatPartnerAddress } from "@/lib/partner-location";
import { trpc } from "@/lib/trpc";
import { usePermissions } from "@/_core/hooks/useAuth";
import { Building2, Edit3, Eraser, ExternalLink, Mail, MapPin, Navigation, Phone, Plus, Search, SlidersHorizontal, UsersRound } from "lucide-react";
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
  addressStreet: string | null;
  addressNumber: string | null;
  addressComplement: string | null;
  addressNeighborhood: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressPostalCode: string | null;
  addressCountry: string | null;
  latitude: number | null;
  longitude: number | null;
  relationshipStatus: PartnerStatus;
  notes: string | null;
  entityId: number | null;
  logoUrl: string | null;
};

type PartnerForm = Omit<PartnerRecord, "id" | "logoUrl"> & { logo?: ImageUploadValue | null };
const emptyForm: PartnerForm = {
  displayName: "", legalName: "", taxId: "", category: "", contactName: "", email: "", phone: "",
  addressStreet: "", addressNumber: "", addressComplement: "", addressNeighborhood: "", addressCity: "", addressState: "", addressPostalCode: "", addressCountry: "BR", latitude: null, longitude: null,
  relationshipStatus: "prospect", notes: "", entityId: null, logo: null,
};

const statusOptions: Array<{ value: PartnerStatus; label: string }> = [
  { value: "prospect", label: "Prospecção" },
  { value: "active", label: "Ativo" },
  { value: "inactive", label: "Inativo" },
  { value: "blocked", label: "Bloqueado" },
];

export default function Partners() {
  const { can } = usePermissions();
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<PartnerStatus | "all">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<PartnerForm>(emptyForm);
  const filters = useMemo(() => ({ search: search || undefined, status: status === "all" ? undefined : status }), [search, status]);
  const partners = trpc.admin.partners.list.useQuery(filters, { retry: false });
  const entities = trpc.admin.entities.list.useQuery(undefined, { retry: false });
  const createPartner = trpc.admin.partners.create.useMutation({ onSuccess: async () => { await utils.admin.partners.list.invalidate(); toast.success("Parceiro cadastrado com sucesso"); closeDialog(); }, onError: error => toast.error(error.message) });
  const updatePartner = trpc.admin.partners.update.useMutation({ onSuccess: async () => { await utils.admin.partners.list.invalidate(); toast.success("Dados do parceiro atualizados"); closeDialog(); }, onError: error => toast.error(error.message) });

  function closeDialog() { setDialogOpen(false); setEditingId(null); setForm(emptyForm); }
  function openCreate() { setEditingId(null); setForm(emptyForm); setDialogOpen(true); }
  function openEdit(partner: PartnerRecord) { setEditingId(partner.id); setForm({ ...partner, addressCountry: partner.addressCountry || "BR" }); setDialogOpen(true); }

  function savePartner() {
    const data = {
      displayName: form.displayName.trim(),
      legalName: emptyToNull(form.legalName ?? ""), taxId: emptyToNull(form.taxId ?? ""), category: emptyToNull(form.category ?? ""), contactName: emptyToNull(form.contactName ?? ""), email: emptyToNull(form.email ?? ""), phone: emptyToNull(form.phone ?? ""),
      addressStreet: emptyToNull(form.addressStreet ?? ""), addressNumber: emptyToNull(form.addressNumber ?? ""), addressComplement: emptyToNull(form.addressComplement ?? ""), addressNeighborhood: emptyToNull(form.addressNeighborhood ?? ""), addressCity: emptyToNull(form.addressCity ?? ""), addressState: emptyToNull(form.addressState ?? "")?.toUpperCase() ?? null, addressPostalCode: emptyToNull(form.addressPostalCode ?? ""), addressCountry: emptyToNull(form.addressCountry ?? "")?.toUpperCase() ?? "BR",
      latitude: Number.isFinite(form.latitude) ? form.latitude : null, longitude: Number.isFinite(form.longitude) ? form.longitude : null,
      relationshipStatus: form.relationshipStatus, notes: emptyToNull(form.notes ?? ""), entityId: form.entityId ?? null, logo: form.logo ?? null,
    };
    if (!data.displayName) return toast.error("Informe o nome comercial do parceiro");
    if ((data.latitude == null) !== (data.longitude == null)) return toast.error("Informe latitude e longitude juntas");
    if (editingId) updatePartner.mutate({ id: editingId, data }); else createPartner.mutate(data);
  }

  const isSaving = createPartner.isPending || updatePartner.isPending;
  const formAddress = formatPartnerAddress(form);
  const formGpsUrl = buildPartnerGpsUrl(form);
  const clearLocation = () => setForm(current => ({
    ...current,
    addressStreet: "", addressNumber: "", addressComplement: "", addressNeighborhood: "", addressCity: "", addressState: "", addressPostalCode: "", addressCountry: "BR", latitude: null, longitude: null,
  }));

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary-foreground/60">Relacionamento</p><h1 className="mt-2 text-3xl font-extrabold tracking-tight">Parceiros</h1><p className="mt-2 text-sm text-muted-foreground">Mantenha contatos, endereço validado e o ponto GPS de cada parceiro.</p></div>{can("partners", "create") && <Button onClick={openCreate} className="h-11 gap-2 px-5 font-bold"><Plus className="h-4 w-4" /> Novo parceiro</Button>}</header>

      <section className="flex flex-col gap-3 rounded-2xl border border-black/5 bg-white p-4 shadow-[0_6px_20px_rgba(17,20,24,0.025)] lg:flex-row lg:items-center"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={event => setSearch(event.target.value)} className="h-10 border-black/7 bg-[#fafaf7] pl-9" placeholder="Buscar parceiro, contato ou cidade" /></div><div className="flex items-center gap-2"><SlidersHorizontal className="h-4 w-4 text-muted-foreground" /><Select value={status} onValueChange={value => setStatus(value as PartnerStatus | "all")}><SelectTrigger className="h-10 w-[172px] border-black/7 bg-[#fafaf7]"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">Todos os status</SelectItem>{statusOptions.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></div></section>

      <section className="overflow-hidden rounded-[1.5rem] border border-black/5 bg-white shadow-[0_8px_26px_rgba(17,20,24,0.035)]"><div className="hidden grid-cols-[minmax(190px,1.25fr)_1fr_1fr_0.7fr_120px_56px] gap-4 border-b border-black/5 px-6 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground xl:grid"><span>Parceiro</span><span>Contato</span><span>Localização</span><span>Categoria</span><span>Status</span><span /></div>{partners.isLoading && <div className="p-8 text-sm text-muted-foreground">Carregando parceiros…</div>}{partners.isError && <div className="p-8 text-sm text-rose-700">Não foi possível carregar os parceiros. Tente novamente.</div>}{!partners.isLoading && !partners.isError && partners.data?.length === 0 && <EmptyPartners onCreate={openCreate} />}<div className="divide-y divide-black/5">{partners.data?.map(partner => <PartnerRow key={partner.id} partner={partner} onEdit={() => openEdit(partner)} />)}</div></section>

      <Dialog open={dialogOpen} onOpenChange={open => !open && closeDialog()}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl"><DialogHeader><DialogTitle>{editingId ? "Editar parceiro" : "Novo parceiro"}</DialogTitle><DialogDescription>Cadastre o endereço completo, valide o ponto no mapa e disponibilize um destino preciso para GPS.</DialogDescription></DialogHeader><div className="grid gap-5 py-3 sm:grid-cols-2"><Field label="Nome comercial *"><Input value={form.displayName} onChange={event => setForm({ ...form, displayName: event.target.value })} placeholder="Ex.: Posto Horizonte" /></Field><Field label="Entidade"><Select value={form.entityId?.toString() ?? "none"} onValueChange={value => setForm({ ...form, entityId: value === "none" ? null : Number(value) })}><SelectTrigger><SelectValue placeholder="Selecione a entidade" /></SelectTrigger><SelectContent><SelectItem value="none">Sem entidade vinculada</SelectItem>{entities.data?.map(entity => <SelectItem key={entity.id} value={entity.id.toString()}>{entity.name}</SelectItem>)}</SelectContent></Select></Field><Field label="Razão social"><Input value={form.legalName ?? ""} onChange={event => setForm({ ...form, legalName: event.target.value })} /></Field><Field label="Categoria"><Input value={form.category ?? ""} onChange={event => setForm({ ...form, category: event.target.value })} placeholder="Ex.: Alimentação" /></Field><Field label="Status do relacionamento"><Select value={form.relationshipStatus} onValueChange={value => setForm({ ...form, relationshipStatus: value as PartnerStatus })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{statusOptions.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></Field><Field label="Responsável de contato"><Input value={form.contactName ?? ""} onChange={event => setForm({ ...form, contactName: event.target.value })} /></Field><Field label="Telefone"><Input value={form.phone ?? ""} onChange={event => setForm({ ...form, phone: event.target.value })} /></Field><Field label="E-mail" className="sm:col-span-2"><Input type="email" value={form.email ?? ""} onChange={event => setForm({ ...form, email: event.target.value })} /></Field><Field label="CNPJ / documento" className="sm:col-span-2"><Input value={form.taxId ?? ""} onChange={event => setForm({ ...form, taxId: event.target.value })} /></Field><div className="sm:col-span-2"><ImageUploadField label="Logo do parceiro" hint="Identifique o parceiro nas listagens e materiais operacionais." value={form.logo} previewUrl={editingId ? (form as PartnerForm & { logoUrl?: string | null }).logoUrl : null} onChange={logo => setForm({ ...form, logo })} /></div>
        <div className="space-y-4 border-t border-black/7 pt-5 sm:col-span-2"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><p className="text-sm font-extrabold">Endereço e destino GPS</p><p className="mt-1 text-xs text-muted-foreground">Preencha os dados e valide o ponto no mapa para gerar uma rota mais precisa.</p></div>{(formAddress || formGpsUrl) && <Button type="button" variant="ghost" size="sm" onClick={clearLocation} className="h-8 gap-2 self-start text-muted-foreground hover:text-rose-700"><Eraser className="h-3.5 w-3.5" /> Limpar endereço e ponto</Button>}</div><div className="grid gap-4 sm:grid-cols-6"><Field label="Logradouro" className="sm:col-span-4"><Input value={form.addressStreet ?? ""} onChange={event => setForm({ ...form, addressStreet: event.target.value })} placeholder="Ex.: Rodovia Anhanguera" /></Field><Field label="Número" className="sm:col-span-2"><Input value={form.addressNumber ?? ""} onChange={event => setForm({ ...form, addressNumber: event.target.value })} /></Field><Field label="Complemento" className="sm:col-span-3"><Input value={form.addressComplement ?? ""} onChange={event => setForm({ ...form, addressComplement: event.target.value })} placeholder="Ex.: Km 23" /></Field><Field label="Bairro" className="sm:col-span-3"><Input value={form.addressNeighborhood ?? ""} onChange={event => setForm({ ...form, addressNeighborhood: event.target.value })} /></Field><Field label="Cidade" className="sm:col-span-3"><Input value={form.addressCity ?? ""} onChange={event => setForm({ ...form, addressCity: event.target.value })} /></Field><Field label="UF" className="sm:col-span-1"><Input maxLength={2} value={form.addressState ?? ""} onChange={event => setForm({ ...form, addressState: event.target.value.toUpperCase() })} placeholder="SP" /></Field><Field label="CEP" className="sm:col-span-2"><Input value={form.addressPostalCode ?? ""} onChange={event => setForm({ ...form, addressPostalCode: event.target.value })} placeholder="00000-000" /></Field><Field label="País" className="sm:col-span-6"><Input maxLength={2} value={form.addressCountry ?? "BR"} onChange={event => setForm({ ...form, addressCountry: event.target.value.toUpperCase() })} placeholder="BR" /></Field></div><PartnerLocationMap address={formAddress} location={form} onLocationChange={({ lat, lng }) => setForm(current => ({ ...current, latitude: lat, longitude: lng }))} />{formGpsUrl && <a href={formGpsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs font-extrabold text-primary underline-offset-4 hover:underline"><Navigation className="h-3.5 w-3.5" /> Abrir destino GPS em nova aba <ExternalLink className="h-3 w-3" /></a>}</div>
        <Field label="Observações" className="sm:col-span-2"><Textarea value={form.notes ?? ""} onChange={event => setForm({ ...form, notes: event.target.value })} className="min-h-24 resize-none" placeholder="Informações relevantes para a operação" /></Field></div><DialogFooter><Button variant="outline" onClick={closeDialog}>Cancelar</Button><Button onClick={savePartner} disabled={isSaving}>{isSaving ? "Salvando…" : editingId ? "Salvar alterações" : "Cadastrar parceiro"}</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}

function PartnerRow({ partner, onEdit }: { partner: PartnerRecord; onEdit: () => void }) {
  const address = formatPartnerAddress(partner);
  const gpsUrl = buildPartnerGpsUrl(partner);
  return <div className="grid gap-4 px-5 py-5 xl:grid-cols-[minmax(190px,1.25fr)_1fr_1fr_0.7fr_120px_56px] xl:items-center xl:px-6"><div className="min-w-0"><div className="flex items-center gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/18 text-primary-foreground">{partner.logoUrl ? <img src={partner.logoUrl} alt="" className="h-full w-full object-cover" /> : <Building2 className="h-4 w-4" />}</div><div className="min-w-0"><p className="truncate text-sm font-extrabold">{partner.displayName}</p><p className="truncate text-xs text-muted-foreground">{partner.legalName || "Sem razão social cadastrada"}</p></div></div></div><div className="space-y-1 text-xs text-muted-foreground"><p className="flex items-center gap-1.5 truncate"><Mail className="h-3.5 w-3.5" /> {partner.email || "E-mail não informado"}</p><p className="flex items-center gap-1.5 truncate"><Phone className="h-3.5 w-3.5" /> {partner.contactName || partner.phone || "Contato não informado"}</p></div><div className="min-w-0 text-xs"><p className="flex items-start gap-1.5 font-medium text-foreground/75"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /><span className="line-clamp-2">{address || "Endereço pendente"}</span></p>{gpsUrl && <a href={gpsUrl} target="_blank" rel="noreferrer" className="mt-1.5 inline-flex items-center gap-1 font-bold text-primary hover:underline"><Navigation className="h-3 w-3" /> Abrir GPS <ExternalLink className="h-3 w-3" /></a>}</div><p className="text-xs font-semibold text-foreground/75">{partner.category || "Sem categoria"}</p><div><StatusBadge status={partner.relationshipStatus} /></div><Button variant="ghost" size="icon" className="h-9 w-9 justify-self-end rounded-xl" onClick={onEdit} aria-label={`Editar ${partner.displayName}`}><Edit3 className="h-4 w-4" /></Button></div>;
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) { return <div className={`space-y-2 ${className}`}><Label className="text-xs font-bold">{label}</Label>{children}</div>; }
function EmptyPartners({ onCreate }: { onCreate: () => void }) { return <div className="px-6 py-16 text-center"><UsersRound className="mx-auto h-7 w-7 text-primary" /><h2 className="mt-4 text-base font-extrabold">A base de parceiros está vazia.</h2><p className="mt-1 text-sm text-muted-foreground">Cadastre o primeiro parceiro para começar a criar benefícios.</p><Button variant="outline" onClick={onCreate} className="mt-5 gap-2"><Plus className="h-4 w-4" /> Cadastrar parceiro</Button></div>; }
