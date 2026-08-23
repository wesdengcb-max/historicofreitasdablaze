import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: tokenData, error } = await supabaseAdmin
      .from("vip_tokens")
      .select("*")
      .eq("token", data.token)
      .single();

    if (error || !tokenData) {
      console.error("Token lookup failed or no token found:", { token: data.token, error: error?.message });
      throw new Error("Token inválido ou expirado");
    }

    if (tokenData.status !== 'active') {
      throw new Error("Este token está desativado");
    }

    console.log("Token record found:", { 
      token: tokenData.token, 
      status: tokenData.status, 
      expires_at: tokenData.expires_at,
      level: tokenData.level
    });

    // Check expiration - null expires_at means no expiration
    if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
      console.log("Token expired:", data.token, "at", tokenData.expires_at);
      await supabaseAdmin
        .from("vip_tokens")
        .update({ status: "expired" })
        .eq("id", tokenData.id);
      throw new Error("Este token expirou");
    }

    return { 
      success: true, 
      member_name: tokenData.member_name, 
      token: tokenData.token,
      level: tokenData.level as "member" | "admin",
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
