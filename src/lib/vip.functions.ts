import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getEvent, setResponseHeader, parseCookies, serializeCookie } from "vinxi/http";

interface ServerContext {
  supabase: SupabaseClient;
}

const VIP_ACCESS_COOKIE = "fw_vip_access";

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
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as ServerContext;
    if (!ctx?.supabase) throw new Error("Internal Server Error: Missing context");

    const { data: tokenData, error } = await ctx.supabase
      .from("vip_tokens")
      .select("*")
      .eq("token", data.token)
      .eq("status", "active")
      .single();

    if (error || !tokenData) {
      throw new Error("Token inválido ou expirado");
    }

    // Check expiration
    if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
      await ctx.supabase
        .from("vip_tokens")
        .update({ status: "expired" })
        .eq("id", tokenData.id);
      throw new Error("Este token expirou");
    }

    const event = getEvent();
    const cookieValue = JSON.stringify({
      token: tokenData.token,
      member_name: tokenData.member_name,
      expires_at: tokenData.expires_at
    });

    const cookie = serializeCookie(VIP_ACCESS_COOKIE, cookieValue, {
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/",
      httpOnly: true,
      sameSite: "lax"
    });

    setResponseHeader(event, "Set-Cookie", cookie);

    return { success: true, member_name: tokenData.member_name };
  });

export const checkVipSession = createServerFn({ method: "GET" })
  .handler(async () => {
    const event = getEvent();
    const cookies = parseCookies(event);
    const cookie = cookies[VIP_ACCESS_COOKIE];
    
    if (!cookie) return { isVip: false };
    
    try {
      const session = JSON.parse(decodeURIComponent(cookie));
      return { isVip: true, member_name: session.member_name };
    } catch {
      return { isVip: false };
    }
  });

export const listVipTokens = createServerFn({ method: "GET" })
  .handler(async ({ context }) => {
    const ctx = context as unknown as ServerContext;
    if (!ctx?.supabase) throw new Error("Internal Server Error: Missing context");
    
    const { data, error } = await ctx.supabase
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
    token: z.string().optional()
  }).parse(data))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as ServerContext;
    if (!ctx?.supabase) throw new Error("Internal Server Error: Missing context");

    const token = data.token || generateVipToken();
    
    const { data: newToken, error } = await ctx.supabase
      .from("vip_tokens")
      .insert({
        token,
        member_name: data.member_name,
        expires_at: data.expires_at,
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
    expires_at: z.string().optional()
  }).parse(data))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as ServerContext;
    if (!ctx?.supabase) throw new Error("Internal Server Error: Missing context");

    const { data: updated, error } = await ctx.supabase
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
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as ServerContext;
    if (!ctx?.supabase) throw new Error("Internal Server Error: Missing context");

    const { error } = await ctx.supabase
      .from("vip_tokens")
      .delete()
      .eq("id", data.id);

    if (error) throw error;
    return { success: true };
  });
