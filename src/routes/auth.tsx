import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Lock, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { createFirstAdmin, getSetupStatus } from "@/lib/auth.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrar — Freitas da Blaze" },
      { name: "description", content: "Acesso restrito à área de análise do Freitas da Blaze." },
      { property: "og:title", content: "Entrar — Freitas da Blaze" },
      { property: "og:description", content: "Acesso restrito à área de análise do Freitas da Blaze." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [needsSetup, setNeedsSetup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/app", replace: true });
    });
    getSetupStatus()
      .then((r) => setNeedsSetup(r.needsSetup))
      .catch(() => setNeedsSetup(false));
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (needsSetup) {
        await createFirstAdmin({ data: { email, password, nome } });
      }
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw new Error("E-mail ou senha incorretos");
      navigate({ to: "/app", replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível entrar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4">
      <div className="glass-card w-full max-w-sm rounded-2xl p-7">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-red-500/15 text-red-400 ring-1 ring-red-500/30">
            {needsSetup ? <ShieldCheck className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
          </span>
          <div>
            <h1 className="text-base font-semibold tracking-tight">
              {needsSetup ? "Criar conta admin" : "Área restrita"}
            </h1>
            <p className="text-xs text-muted-foreground">
              {needsSetup
                ? "Defina o login principal do sistema."
                : "Entre com o login fornecido pelo administrador."}
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          {needsSetup && (
            <Input
              placeholder="Seu nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              autoComplete="name"
            />
          )}
          <Input
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
          />
          <Input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={needsSetup ? "new-password" : "current-password"}
            required
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {needsSetup ? "Criar e entrar" : "Entrar"}
          </Button>
        </form>

        {!needsSetup && (
          <p className="mt-4 text-center text-[11px] text-muted-foreground">
            Não há cadastro público. Peça acesso ao administrador.
          </p>
        )}
      </div>
    </div>
  );
}