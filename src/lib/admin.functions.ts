import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

interface ServerContext {
  supabase: SupabaseClient;
}

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as unknown as ServerContext;
    if (!ctx?.supabase) throw new Error("Internal Server Error: Missing context");
    
    // Only admins can list users
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    // Check if current user is admin
    const userId = (context as any).userId;
    if (!userId) throw new Error("Unauthorized: User not found in context");
    
    const { data: isAdmin } = await ctx.supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin"
    });
    
    if (!isAdmin) throw new Error("Forbidden: User does not have admin role");

    // Fetch users and their roles
    const { data: users, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    if (usersError) throw usersError;

    const { data: roles, error: rolesError } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role");
    
    if (rolesError) throw rolesError;

    const rolesMap = new Map(roles.map((r: any) => [r.user_id, r.role]));

    return users.users.map(u => ({
      id: u.id,
      email: u.email,
      role: rolesMap.get(u.id) || "user",
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      status: u.banned_until ? "inactive" : "active"
    }));
  });

export const createUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({
    email: z.string().email(),
    password: z.string().min(6),
    role: z.enum(["admin", "user"])
  }).parse(data))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as ServerContext;
    if (!ctx?.supabase) throw new Error("Internal Server Error: Missing context");
    
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    const { data: { session } } = await ctx.supabase.auth.getSession();
    if (!session) throw new Error("Unauthorized");
    
    const { data: isAdmin } = await ctx.supabase.rpc("has_role", {
      _user_id: session.user.id,
      _role: "admin"
    });
    
    if (!isAdmin) throw new Error("Forbidden");

    // Create user in auth
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true
    });

    if (createError) throw createError;
    if (!newUser?.user) throw new Error("Failed to create user");

    // Assign role
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: newUser.user.id, role: data.role });

    if (roleError) throw roleError;

    return newUser.user;
  });

export const updateUserStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({
    userId: z.string().uuid(),
    active: z.boolean()
  }).parse(data))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as ServerContext;
    if (!ctx?.supabase) throw new Error("Internal Server Error: Missing context");
    
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    const { data: { session } } = await ctx.supabase.auth.getSession();
    if (!session) throw new Error("Unauthorized");
    
    const { data: isAdmin } = await ctx.supabase.rpc("has_role", {
      _user_id: session.user.id,
      _role: "admin"
    });
    
    if (!isAdmin) throw new Error("Forbidden");

    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      ban_duration: data.active ? "none" : "876000h" // Ban for 100 years if inactive
    });

    if (error) throw error;
    return { success: true };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({
    userId: z.string().uuid()
  }).parse(data))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as ServerContext;
    if (!ctx?.supabase) throw new Error("Internal Server Error: Missing context");
    
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    const { data: { session } } = await ctx.supabase.auth.getSession();
    if (!session) throw new Error("Unauthorized");
    
    const { data: isAdmin } = await ctx.supabase.rpc("has_role", {
      _user_id: session.user.id,
      _role: "admin"
    });
    
    if (!isAdmin) throw new Error("Forbidden");

    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);

    if (error) throw error;
    return { success: true };
  });

export const updateUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({
    userId: z.string().uuid(),
    role: z.enum(["admin", "user"])
  }).parse(data))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as ServerContext;
    if (!ctx?.supabase) throw new Error("Internal Server Error: Missing context");
    
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    const { data: { session } } = await ctx.supabase.auth.getSession();
    if (!session) throw new Error("Unauthorized");
    
    const { data: isAdmin } = await ctx.supabase.rpc("has_role", {
      _user_id: session.user.id,
      _role: "admin"
    });
    
    if (!isAdmin) throw new Error("Forbidden");

    // Upsert role
    const { error } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: data.userId, role: data.role }, { onConflict: 'user_id,role' });

    if (error) throw error;
    return { success: true };
  });
