import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Token mestre administrativo hardcoded para garantia de acesso
export const MASTER_ADMIN_TOKEN = 'admin87850424';

// Generate a random token in format FW-XXXX-XXXX
export const generateVipToken = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const part1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `FW-${part1}-${part2}`;
};

export const validateToken = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({
    token: z.string().min(1)
  }).parse(data))
  .handler(async ({ data }: { data: { token: string } }) => {
    // SECURITY: This function runs on the server.
    // We check the token against the database using supabaseAdmin (which bypasses RLS).
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const inputToken = data.token.trim();
    console.log("[VIP Auth Server] Validating token:", inputToken);

    // Fallback mestre administrativo
    if (inputToken === MASTER_ADMIN_TOKEN) {
      console.log("[VIP Auth Server] Master Admin token recognized via hardcoded check.");
      return { 
        success: true, 
        member_name: "Administrador Geral", 
        token: inputToken,
        level: "admin",
        expires_at: null
      };
    }

    // Database lookup for other tokens
    // Using explicit column selection to avoid any ambiguity
    const { data: tokenData, error } = await supabaseAdmin
      .from("vip_tokens")
      .select("id, token, member_name, status, expires_at, level")
      .eq("token", inputToken)
      .maybeSingle();

    if (error) {
      console.error("[VIP Auth Server] Database error:", error.message, error.details, error.hint);
      throw new Error(`Erro de conexão com o banco de dados: ${error.message}`);
    }

    if (!tokenData) {
      console.warn("[VIP Auth Server] Token not found in database:", inputToken);
      throw new Error("Token inválido ou expirado");
    }

    console.log("[VIP Auth Server] Database record found:", JSON.stringify(tokenData));

    // Normalize level to expected types
    const level = (tokenData.level === 'admin' ? 'admin' : 'member') as "member" | "admin";

    if (tokenData.status !== 'active') {
      console.warn("[VIP Auth Server] Token status is not active:", tokenData.status);
      throw new Error("Este token está desativado");
    }

    // Check expiration
    if (tokenData.expires_at) {
      const expirationDate = new Date(tokenData.expires_at);
      const now = new Date();
      if (expirationDate < now) {
        console.warn("[VIP Auth Server] Token expired at:", tokenData.expires_at);
        // Auto-update status to expired if it was active but time passed
        await supabaseAdmin
          .from("vip_tokens")
          .update({ status: "expired" })
          .eq("id", tokenData.id);
        throw new Error("Este token expirou");
      }
    }

    console.log("[VIP Auth Server] Token successfully validated for:", tokenData.member_name);
    return { 
      success: true, 
      member_name: tokenData.member_name, 
      token: tokenData.token,
      level: level,
      expires_at: tokenData.expires_at
    };
  });

export const listVipTokens = createServerFn({ method: "GET" })
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("vip_tokens")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  });

export const createVipToken = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({
    member_name: z.string().min(1),
    expires_at: z.string().optional(),
    token: z.string().optional(),
    level: z.enum(["member", "admin"]).default("member")
  }).parse(data))
  .handler(async ({ data }: { data: { member_name: string; expires_at?: string; token?: string; level: "member" | "admin" } }) => {
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
    id: z.string().uuid(),
    member_name: z.string().optional(),
    status: z.enum(["active", "inactive", "expired"]).optional(),
    expires_at: z.string().optional(),
    level: z.enum(["member", "admin"]).optional()
  }).parse(data))
  .handler(async ({ data }: { data: { id: string; member_name?: string; status?: "active" | "inactive" | "expired"; expires_at?: string; level?: "member" | "admin" } }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: updated, error } = await supabaseAdmin
      .from("vip_tokens")
      .update(data)
      .eq("id", data.id)
      .select()
      .single();
    if (error) throw error;
    return updated;
  });

export const deleteVipToken = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({
    id: z.string().uuid()
  }).parse(data))
  .handler(async ({ data }: { data: { id: string } }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("vip_tokens")
      .delete()
      .eq("id", data.id);
    if (error) throw error;
    return { success: true };
  });
