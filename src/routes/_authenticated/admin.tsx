import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, ShieldCheck, Trash2, KeyRound, Users } from "lucide-react";
import {
  createAppUser,
  deleteAppUser,
  getMyProfile,
  listAppUsers,
  resetAppUserPassword,
} from "@/lib/auth.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/double/Card";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Gerenciar acessos — Freitas da Blaze" },
      { name: "description", content: "Painel do administrador para criar e remover logins de acesso." },
      { property: "og:title", content: "Gerenciar acessos — Freitas da Blaze" },
      { property: "og:description", content: "Painel do administrador para criar e remover logins de acesso." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

type AppUser = Awaited<ReturnType<typeof listAppUsers>>[number];

function AdminPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [form, setForm] = useState({ nome: "", email: "", password: "", admin: false });

  const refresh = useCallback(async () => {
    const list = await listAppUsers();
    setUsers(list);
  }, []);

  useEffect(() => {
    getMyProfile()
      .then(async (p) => {
        setAllowed(p.isAdmin);
        if (p.isAdmin) await refresh();
      })
      .catch(() => setAllowed(false));
  }, [refresh]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      await createAppUser({ data: form });
      setForm({ nome: "", email: "", password: "", admin: false });
      setOk("Login criado com sucesso.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar login");
    } finally {
      setBusy(false);
    }
  }

  async function handleReset(user: AppUser) {
    const password = window.prompt(`Nova senha para ${user.email} (mín. 8 caracteres)`);
    if (!password) return;
    try {
      await resetAppUserPassword({ data: { id: user.id, password } });
      setOk("Senha atualizada.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar senha");
    }
  }

  async function handleDelete(user: AppUser) {
    if (!window.confirm(`Excluir o acesso de ${user.email}?`)) return;
    try {
      await deleteAppUser({ data: { id: user.id } });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir");
    }
  }

  if (allowed === null) {
    return (
      <div className="grid min-h-svh place-items-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="grid min-h-svh place-items-center px-4 text-center">
        <div>
          <h1 className="text-lg font-semibold">Acesso restrito</h1>
          <p className="mt-1 text-sm text-muted-foreground">Somente o administrador pode gerenciar logins.</p>
          <Button className="mt-4" onClick={() => navigate({ to: "/app" })}>
            Voltar ao histórico
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[900px] space-y-5 px-4 py-8">
      <header className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-red-500/15 text-red-400 ring-1 ring-red-500/30">
          <Users className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Gerenciar acessos</h1>
          <p className="text-xs text-muted-foreground">Crie e remova logins do sistema.</p>
        </div>
      </header>

      <Card title="Novo login" icon={<Plus className="h-4 w-4" />}>
        <form onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-2">
          <Input
            placeholder="Nome"
            value={form.nome}
            onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
          />
          <Input
            type="email"
            placeholder="E-mail"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            required
          />
          <Input
            type="text"
            placeholder="Senha (mín. 8 caracteres)"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            required
          />
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox
              checked={form.admin}
              onCheckedChange={(v) => setForm((f) => ({ ...f, admin: v === true }))}
            />
            Também é administrador
          </label>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar login
            </Button>
          </div>
        </form>
        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
        {ok && <p className="mt-3 text-xs text-emerald-400">{ok}</p>}
      </Card>

      <Card title={`Contas (${users.length})`} icon={<ShieldCheck className="h-4 w-4" />}>
        <ul className="divide-y divide-border">
          {users.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {u.nome || u.email}
                  {u.isAdmin && (
                    <span className="ml-2 rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] font-mono tracking-widest text-red-400">
                      ADMIN
                    </span>
                  )}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {u.email} · último acesso:{" "}
                  {u.ultimoAcesso ? new Date(u.ultimoAcesso).toLocaleString("pt-BR") : "nunca"}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => handleReset(u)}>
                <KeyRound className="mr-1.5 h-3.5 w-3.5" /> Senha
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleDelete(u)}>
                <Trash2 className="mr-1.5 h-3.5 w-3.5 text-red-400" /> Excluir
              </Button>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}