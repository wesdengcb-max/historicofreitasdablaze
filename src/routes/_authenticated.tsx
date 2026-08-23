import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'
import { supabase } from '@/integrations/supabase/client'

export const Route = createFileRoute('/_authenticated')({ 
  component: () => <Outlet />,
  beforeLoad: async ({ location }) => {
    // Check Supabase session (traditional admin login)
    const { data: { session } } = await supabase.auth.getSession()
    
    // Check VIP token access (hybrid flow)
    let isVip = false;
    let vipLevel: 'member' | 'admin' | null = null;
    
    if (typeof window !== 'undefined') {
      isVip = localStorage.getItem("freitas_white_vip_status") === "true";
      vipLevel = localStorage.getItem("freitas_white_vip_level") as any;
    }

    const hasAdminAccess = !!session || vipLevel === 'admin';

    // Admin routes REQUIRE admin privileges (Supabase OR Admin Token)
    if (location.pathname.startsWith('/admin')) {
      if (!hasAdminAccess) {
        throw redirect({
          to: '/vip-login' as any,
          search: { redirect: location.href } as any,
        })
      }
      return { session, user: session?.user || null, authType: 'admin' }
    }

    // VIP area (like /app, /sinais, etc) allows either Supabase session OR VIP token
    if (!session && !isVip) {
      throw redirect({
        to: '/vip-login' as any,
        search: { redirect: location.href } as any,
      })
    }
    
    return {
      session,
      user: session?.user || null,
      authType: hasAdminAccess ? 'admin' : 'vip'
    }
  },
})
