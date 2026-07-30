import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type NewUserInput = { email: string; password: string; nome: string };

function validEmail(v: unknown): v is string {
  return typeof v === "string" && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v) && v.length <= 200;
}

async function assertAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (error || !data.user) throw new Error("Não autorizado");
  const role = (data.user.app_metadata as Record<string, unknown> | null)?.role;
  if (role !== "admin") throw new Error("Apenas administradores podem gerenciar contas");
  return supabaseAdmin;
}

/** Diz se o sistema ainda não tem nenhuma conta (permite criar o admin inicial). */
export const getSetupStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 });
  if (error) throw new Error(error.message);
  return { needsSetup: data.users.length === 0 };
});

/** Cria o primeiro administrador. Só funciona enquanto não existir nenhuma conta. */
export const createFirstAdmin = createServerFn({ method: "POST" })
  .inputValidator((data: NewUserInput) => {
    if (!validEmail(data?.email)) throw new Error("E-mail inválido");
    if (typeof data?.password !== "string" || data.password.length < 8)
      throw new Error("A senha precisa ter no mínimo 8 caracteres");
    return { email: data.email.trim().toLowerCase(), password: data.password, nome: String(data.nome ?? "").slice(0, 80) };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const existing = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 });
    if (existing.error) throw new Error(existing.error.message);
    if (existing.data.users.length > 0) throw new Error("O administrador já foi criado");

    const { error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { nome: data.nome || "Admin" },
      app_metadata: { role: "admin" },
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/** Perfil do usuário logado (nome + se é admin). */
export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    if (error || !data.user) throw new Error("Usuário não encontrado");
    return {
      id: data.user.id,
      email: data.user.email ?? "",
      nome: (data.user.user_metadata?.nome as string) ?? "",
      isAdmin: (data.user.app_metadata as Record<string, unknown> | null)?.role === "admin",
    };
  });

export const listAppUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabaseAdmin = await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (error) throw new Error(error.message);
    return data.users.map((u) => ({
      id: u.id,
      email: u.email ?? "",
      nome: (u.user_metadata?.nome as string) ?? "",
      isAdmin: (u.app_metadata as Record<string, unknown> | null)?.role === "admin",
      criadoEm: u.created_at,
      ultimoAcesso: u.last_sign_in_at ?? null,
    }));
  });

export const createAppUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: NewUserInput & { admin?: boolean }) => {
    if (!validEmail(data?.email)) throw new Error("E-mail inválido");
    if (typeof data?.password !== "string" || data.password.length < 8)
      throw new Error("A senha precisa ter no mínimo 8 caracteres");
    return {
      email: data.email.trim().toLowerCase(),
      password: data.password,
      nome: String(data.nome ?? "").slice(0, 80),
      admin: data.admin === true,
    };
  })
  .handler(async ({ data, context }) => {
    const supabaseAdmin = await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { nome: data.nome },
      app_metadata: data.admin ? { role: "admin" } : {},
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const resetAppUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; password: string }) => {
    if (typeof data?.id !== "string" || !data.id) throw new Error("Usuário inválido");
    if (typeof data?.password !== "string" || data.password.length < 8)
      throw new Error("A senha precisa ter no mínimo 8 caracteres");
    return data;
  })
  .handler(async ({ data, context }) => {
    const supabaseAdmin = await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.id, { password: data.password });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const deleteAppUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => {
    if (typeof data?.id !== "string" || !data.id) throw new Error("Usuário inválido");
    return data;
  })
  .handler(async ({ data, context }) => {
    const supabaseAdmin = await assertAdmin(context.userId);
    if (data.id === context.userId) throw new Error("Você não pode excluir a própria conta");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });