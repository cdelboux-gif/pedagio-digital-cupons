import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { usePermissions } from "@/_core/hooks/useAuth";
import { MapPin, Plus, Store as StoreIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type StoreStatus = "active" | "inactive";
type StoreForm = { partnerId: string; name: string; code: string; status: StoreStatus; addressStreet: string; addressNumber: string; addressCity: string; addressState: string };
const emptyForm: StoreForm = { partnerId: "", name: "", code: "", status: "active", addressStreet: "", addressNumber: "", addressCity: "", addressState: "" };

export default function Stores() {
  const { can } = usePermissions();
  const utils = trpc.useUtils();
  const partners = trpc.admin.partners.list.useQuery(undefined, { retry: false });
  const [filterPartnerId, setFilterPartnerId] = useState("all");
  const filterInput = useMemo(() => filterPartnerId === "all" ? undefined : { partnerId: Number(filterPartnerId) }, [filterPartnerId]);
  const stores = trpc.admin.stores.list.useQuery(filterInput, { retry: false });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<StoreForm>(emptyForm);
  const create = trpc.admin.stores.create.useMutation({
    onSuccess: async () => { await utils.admin.stores.list.invalidate(); toast.success("Loja cadastrada"); setForm(emptyForm); setOpen(false); },
    onError: error => toast.error(error.message),
  });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.partnerId || !form.name.trim() || !form.code.trim()) return toast.error("Informe parceiro, nome e código da loja");
    create.mutate({ partnerId: Number(form.partnerId), name: form.name.trim(), code: form.code.trim().toUpperCase(), status: form.status, addressStreet: form.addressStreet.trim() || null, addressNumber: form.addressNumber.trim() || null, addressCity: form.addressCity.trim() || null, addressState: form.addressState.trim().toUpperCase() || null, addressCountry: "BR", addressComplement: null, addressNeighborhood: null, addressPostalCode: null, latitude: null, longitude: null });
  }

  return <div className="mx-auto max-w-[1200px] space-y-6">
    <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary-foreground/60">Rede física</p><h1 className="mt-2 text-3xl font-extrabold tracking-tight">Lojas</h1><p className="mt-2 text-sm text-muted-foreground">Cadastre múltiplas unidades para o mesmo parceiro e direcione cupons por loja.</p></div>{can("stores", "create") && <Button onClick={() => setOpen(value => !value)} className="h-11 gap-2 px-5 font-bold"><Plus className="h-4 w-4" /> Nova loja</Button>}</header>
    <section className="flex flex-col gap-3 rounded-2xl border border-black/5 bg-white p-4 shadow-sm sm:flex-row sm:items-center"><span className="text-xs font-bold text-muted-foreground">Filtrar por parceiro</span><Select value={filterPartnerId} onValueChange={setFilterPartnerId}><SelectTrigger className="h-10 sm:w-72"><SelectValue placeholder="Todos os parceiros" /></SelectTrigger><SelectContent><SelectItem value="all">Todos os parceiros</SelectItem>{partners.data?.map(partner => <SelectItem key={partner.id} value={partner.id.toString()}>{partner.displayName}</SelectItem>)}</SelectContent></Select></section>
    {open && can("stores", "create") && <Card className="border-0 shadow-sm"><CardHeader><CardTitle className="text-xl">Cadastrar loja</CardTitle></CardHeader><CardContent><form onSubmit={submit} className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>Parceiro *</Label><Select value={form.partnerId} onValueChange={value => setForm({ ...form, partnerId: value })}><SelectTrigger><SelectValue placeholder="Selecione o parceiro" /></SelectTrigger><SelectContent>{partners.data?.map(partner => <SelectItem key={partner.id} value={partner.id.toString()}>{partner.displayName}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Status</Label><Select value={form.status} onValueChange={value => setForm({ ...form, status: value as StoreStatus })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Ativa</SelectItem><SelectItem value="inactive">Inativa</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label>Nome da loja *</Label><Input value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="Ex.: Loja Centro" /></div><div className="space-y-2"><Label>Código *</Label><Input value={form.code} onChange={event => setForm({ ...form, code: event.target.value.toUpperCase() })} placeholder="Ex.: CENTRO" /></div><div className="space-y-2 sm:col-span-2"><Label>Logradouro</Label><Input value={form.addressStreet} onChange={event => setForm({ ...form, addressStreet: event.target.value })} /></div><div className="space-y-2"><Label>Número</Label><Input value={form.addressNumber} onChange={event => setForm({ ...form, addressNumber: event.target.value })} /></div><div className="space-y-2"><Label>Cidade</Label><Input value={form.addressCity} onChange={event => setForm({ ...form, addressCity: event.target.value })} /></div><div className="space-y-2"><Label>UF</Label><Input maxLength={2} value={form.addressState} onChange={event => setForm({ ...form, addressState: event.target.value.toUpperCase() })} /></div><div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit" disabled={create.isPending}>{create.isPending ? "Salvando…" : "Cadastrar loja"}</Button></div></form></CardContent></Card>}
    <Card className="border-0 shadow-sm"><CardHeader><CardTitle>Lojas cadastradas</CardTitle></CardHeader><CardContent className="space-y-3">{stores.isLoading ? <p className="text-sm text-muted-foreground">Carregando lojas…</p> : stores.data?.length ? stores.data.map(({ store, partnerName }) => <div key={store.id} className="flex flex-col gap-3 rounded-2xl border border-black/6 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff8ce] text-[#6a5a00]"><StoreIcon className="h-4 w-4" /></div><div><p className="font-extrabold">{store.name}</p><p className="mt-1 text-xs text-muted-foreground">{partnerName} · <span className="font-mono">{store.code}</span></p>{store.addressCity && <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{store.addressCity}{store.addressState ? ` · ${store.addressState}` : ""}</p>}</div></div><span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${store.status === "active" ? "bg-[#e2f7eb] text-[#16734b]" : "bg-black/5 text-muted-foreground"}`}>{store.status === "active" ? "Ativa" : "Inativa"}</span></div>) : <div className="rounded-2xl border border-dashed border-black/10 p-10 text-center text-sm text-muted-foreground">Nenhuma loja cadastrada.</div>}</CardContent></Card>
  </div>;
}
