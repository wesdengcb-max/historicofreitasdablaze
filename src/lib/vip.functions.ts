import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Generate a random token in format FW-XXXX-XXXX
export const generateVipToken = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const part1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `FW-${part1}-${part2}`;
};

// Helper to verify admin token server-side
const verifyAdminToken = async (token: string | undefined) => {
  if (!token) throw new Error("Acesso negado: Token não fornecido");
  
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  
  const { data, error } = await supabaseAdmin
    .from("vip_tokens")
    .select("level, status")
    .ilike("token", token.trim())
    .maybeSingle();

  if (error || !data || data.status !== 'active' || data.level !== 'admin') {
    throw new Error("Acesso negado: Token administrativo inválido");
  }
  
  return true;
};

export const validateToken = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({
    token: z.string().min(1)
  }).parse(data))
  .handler(async ({ data }: { data: { token: string } }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const inputToken = data.token.trim();

    // Database lookup
    const { data: tokenData, error } = await supabaseAdmin
      .from("vip_tokens")
      .select("id, token, member_name, status, expires_at, level")
      .ilike("token", inputToken)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro de banco: ${error.message}`);
    }

    if (!tokenData) {
      throw new Error("Token inválido ou expirado");
    }

    if (tokenData.status !== 'active') {
      throw new Error("Este token está desativado");
    }

    let daysRemaining = null;
    if (tokenData.expires_at) {
      const expirationDate = new Date(tokenData.expires_at);
      const now = new Date();
      if (expirationDate < now) {
        await supabaseAdmin
          .from("vip_tokens")
          .update({ status: "expired" })
          .eq("id", tokenData.id);
        throw new Error("Este token expirou");
      }
      daysRemaining = Math.max(0, Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    }

    const level = (tokenData.level === 'admin' ? 'admin' : 'member') as "member" | "admin";
    
    // Retorna apenas os campos necessários, omitindo o token e IDs internos
    return { 
      success: true, 
      member_name: tokenData.member_name, 
      level: level,
      expires_at: tokenData.expires_at,
      days_remaining: daysRemaining
    };
  });

export const listVipTokens = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({
    adminToken: z.string().min(1)
  }).parse(data))
  .handler(async ({ data }) => {
    await verifyAdminToken(data.adminToken);
    
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: tokens, error } = await supabaseAdmin
      .from("vip_tokens")
      .select("*")
      .order("created_at", { ascending: false });
      
    if (error) throw error;
    return tokens;
  });

export const createVipToken = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({
    adminToken: z.string().min(1),
    member_name: z.string().min(1),
    expires_at: z.string().optional(),
    token: z.string().optional(),
    level: z.enum(["member", "admin"]).default("member")
  }).parse(data))
  .handler(async ({ data }) => {
    await verifyAdminToken(data.adminToken);
    
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const token = data.token || generateVipToken();
    const { data: newToken, error } = await supabaseAdmin
      .from("vip_tokens")
      .insert({
        token,
        member_name: data.member_name,
        expires_at: data.expires_at,
        level: data.level,
        status: "active"
      })
      .select()
      .single();
    if (error) throw error;
    return newToken;
  });

export const updateVipToken = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({
    adminToken: z.string().min(1),
    id: z.string().uuid(),
    member_name: z.string().optional(),
    status: z.enum(["active", "inactive", "expired"]).optional(),
    expires_at: z.string().optional(),
    level: z.enum(["member", "admin"]).optional()
  }).parse(data))
  .handler(async ({ data }) => {
    await verifyAdminToken(data.adminToken);
    
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { adminToken, ...updateData } = data;
    const { data: updated, error } = await supabaseAdmin
      .from("vip_tokens")
      .update(updateData)
      .eq("id", data.id)
      .select()
      .single();
    if (error) throw error;
    return updated;
  });

export const deleteVipToken = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({
    adminToken: z.string().min(1),
    id: z.string().uuid()
  }).parse(data))
  .handler(async ({ data }) => {
    await verifyAdminToken(data.adminToken);
    
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("vip_tokens")
      .delete()
      .eq("id", data.id);
    if (error) throw error;
    return { success: true };
  });