import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const saveTriggerAudit = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({
    trigger_name: z.string(),
    time_minus_1: z.string(),
    time_target: z.string(),
    time_plus_1: z.string(),
    section_category: z.string(),
    is_win: z.boolean().optional()
  }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("trigger_audits")
      .insert([data]);
    
    if (error) {
      console.error("[saveTriggerAudit] Error:", error);
      throw error;
    }
    return { success: true };
  });

export const updateTriggerAuditResult = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({
    id: z.string(),
    is_win: z.boolean()
  }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("trigger_audits")
      .update({ is_win: data.is_win })
      .eq("id", data.id);
    
    if (error) {
      console.error("[updateTriggerAuditResult] Error:", error);
      throw error;
    }
    return { success: true };
  });

export const getTriggerAuditsForExport = createServerFn({ method: "GET" })
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data, error } = await supabaseAdmin
      .from("trigger_audits")
      .select("*")
      .gte("created_at", twentyFourHoursAgo)
      .order("created_at", { ascending: false });
      
    if (error) {
      console.error("[getTriggerAuditsForExport] Error:", error);
      throw error;
    }
    return data;
  });

export const getBlockStats = createServerFn({ method: "GET" })
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    const now = new Date();
    const currentHour = now.getHours();
    const blockStartHour = Math.floor(currentHour / 4) * 4;
    
    const start = new Date(now);
    start.setHours(blockStartHour, 0, 0, 0);
    const end = new Date(start);
    end.setHours(blockStartHour + 4, 0, 0, 0);

    const { data, error } = await supabaseAdmin
      .from("trigger_audits")
      .select("is_win, section_category")
      .gte("created_at", start.toISOString())
      .lt("created_at", end.toISOString());
      
    if (error) throw error;
    
    return {
      blockStart: start.toISOString(),
      blockEnd: end.toISOString(),
      stats: data
    };
  });

