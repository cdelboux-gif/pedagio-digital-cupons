import { Button } from "@/components/ui/button";
import { startLogin } from "@/const";
import { ArrowRight, LockKeyhole, MailCheck } from "lucide-react";

export default function Invite() {
  const token = new URLSearchParams(window.location.search).get("token") ?? "";
  const validShape = token.startsWith("pd_inv_") && token.length > 20;

  return <main className="flex min-h-screen items-center justify-center bg-[#f7f7f3] px-5 py-10"><section className="w-full max-w-lg rounded-[2rem] border border-black/5 bg-white p-7 shadow-[0_20px_60px_rgba(17,20,24,0.08)] sm:p-10"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff4a8] text-[#5e5100]"><MailCheck className="h-5 w-5" /></div><p className="mt-7 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Pedágio Digital · Backoffice</p><h1 className="mt-3 text-3xl font-extrabold tracking-tight">Você recebeu um convite</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">Use o botão abaixo para entrar com sua conta autorizada. A permissão e o escopo foram definidos pela administração e serão aplicados após o primeiro login.</p>{validShape ? <Button className="mt-8 h-12 w-full gap-2 font-bold" onClick={() => startLogin(token)}>Entrar e aceitar convite <ArrowRight className="h-4 w-4" /></Button> : <div className="mt-8 rounded-2xl bg-rose-50 p-4 text-sm text-rose-800">Este link de convite está incompleto ou inválido. Solicite um novo convite ao administrador.</div>}<div className="mt-6 flex items-start gap-3 border-t border-black/5 pt-5 text-xs leading-5 text-muted-foreground"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />O login é feito pelo OAuth gerenciado. Nenhuma senha é criada ou armazenada neste backoffice.</div></section></main>;
}
