import { supabase } from "@/integrations/supabase/client";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Helper to check if caller is admin
const checkAdmin = async (context: any) => {
  if (!context.auth?.session?.user?.id) {
    throw new Error("Unauthorized");
  }
  
  const { data, error } = await context.supabase
    .rpc("has_role", { 
      _user_id: context.auth.session.user.id, 
      _role: "admin" 
    });
    
  if (error || !data) {
    throw new Error("Forbidden: Admin access required");
  }
};

export const listUsers = createServerFn({ method: "GET" })
  .handler(async ({ context }) => {
    // Only admins can list users
    // Since we need to access auth.users, we use supabaseAdmin
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    // Check if current user is admin
    const { data: { session } } = await context.supabase.auth.getSession();
    if (!session) throw new Error("Unauthorized");
    
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: session.user.id,
      _role: "admin"
    });
    
    if (!isAdmin) throw new Error("Forbidden");

    // Fetch users and their roles
    const { data: users, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    if (usersError) throw usersError;

    const { data: roles, error: rolesError } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role");
    
    if (rolesError) throw rolesError;

    const rolesMap = new Map(roles.map(r => [r.user_id, r.role]));

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
  .inputValidator((data) => z.object({
    email: z.string().email(),
    password: z.string().min(6),
    role: z.enum(["admin", "user"])
  }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    const { data: { session } } = await context.supabase.auth.getSession();
    if (!session) throw new Error("Unauthorized");
    
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
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

    // Assign role
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: newUser.user.id, role: data.role });

    if (roleError) throw roleError;

    return newUser.user;
  });

export const updateUserStatus = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({
    userId: z.string().uuid(),
    active: z.boolean()
  }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    const { data: { session } } = await context.supabase.auth.getSession();
    if (!session) throw new Error("Unauthorized");
    
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
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
  .inputValidator((data) => z.object({
    userId: z.string().uuid()
  }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    const { data: { session } } = await context.supabase.auth.getSession();
    if (!session) throw new Error("Unauthorized");
    
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: session.user.id,
      _role: "admin"
    });
    
    if (!isAdmin) throw new Error("Forbidden");

    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);

    if (error) throw error;
    return { success: true };
  });

export const updateUserRole = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({
    userId: z.string().uuid(),
    role: z.enum(["admin", "user"])
  }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    const { data: { session } } = await context.supabase.auth.getSession();
    if (!session) throw new Error("Unauthorized");
    
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: session.user.id,
      _role: "admin"
    });
    
    if (!isAdmin) throw new Error("Forbidden");

    const { error } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: data.userId, role: data.role }, { onConflict: 'user_id,role' });

    if (error) throw error;
    return { success: true };
  });
