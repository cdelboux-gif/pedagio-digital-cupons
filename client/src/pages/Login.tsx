import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";

export default function Login() {
  const utils = trpc.useUtils();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const login = trpc.auth.login.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      window.location.href = "/";
    },
  });

  return (
    <main className="min-h-screen bg-[#f7f7f3] p-4 sm:p-8">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl overflow-hidden rounded-[2rem] bg-white shadow-2xl sm:min-h-[calc(100vh-4rem)] lg:grid-cols-[1.08fr_0.92fr]">
        <section className="hidden bg-[#111418] p-12 text-white lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <p className="mt-10 text-xs font-bold uppercase tracking-[0.22em] text-primary">Pedágio Digital</p>
            <h1 className="mt-4 max-w-xl text-5xl font-extrabold leading-[1.02] tracking-tight">Backoffice de operação e Road Commerce.</h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-white/60">Acesso próprio da Pedágio Digital para campanhas, parceiros, cupons, inteligência e operação da plataforma.</p>
          </div>
          <p className="text-xs text-white/35">Ambiente de homologação · acesso controlado</p>
        </section>

        <section className="flex items-center justify-center p-7 sm:p-12">
          <div className="w-full max-w-sm">
            <div className="mb-8 lg:hidden">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#111418] text-primary">
                <ShieldCheck className="h-6 w-6" />
              </div>
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Acesso seguro</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight">Entrar no backoffice</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">Use sua credencial de administrador da Pedágio Digital.</p>

            <form
              className="mt-8 space-y-5"
              onSubmit={event => {
                event.preventDefault();
                login.mutate({ email, password });
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  placeholder="seu@email.com"
                  required
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  placeholder="Sua senha"
                  required
                  minLength={8}
                  className="h-12"
                />
              </div>

              {login.error && (
                <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  {login.error.message.includes("inválidos") ? "E-mail ou senha inválidos." : "Não foi possível autenticar. Tente novamente."}
                </div>
              )}

              <Button type="submit" disabled={login.isPending} className="h-12 w-full font-bold">
                {login.isPending ? "Entrando..." : "Entrar"}
              </Button>
            </form>

            <p className="mt-6 text-center text-[11px] leading-5 text-muted-foreground">A sessão é protegida por cookie seguro e token assinado. Não compartilhe sua credencial.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
