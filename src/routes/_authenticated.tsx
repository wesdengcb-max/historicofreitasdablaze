import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'
import { supabase } from '@/integrations/supabase/client'
import { useVipStore } from '@/lib/vipStore'

export const Route = createFileRoute('/_authenticated')({ 
  component: () => <Outlet />,
  beforeLoad: async ({ location }) => {
    // We check Supabase session first (for Admins)
    const { data: { session } } = await supabase.auth.getSession()
    
    // In beforeLoad, we can check localStorage if in browser
    const isVip = typeof window !== 'undefined' 
      ? localStorage.getItem("freitas_white_vip_status") === "true"
      : false;

    // Admin routes REQUIRE Supabase session
    if (location.pathname.startsWith('/admin')) {
      if (!session) {
        throw redirect({
          to: '/auth' as any,
          search: { redirect: location.href } as any,
        })
      }
      return { session, user: session.user, authType: 'admin' }
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
      authType: session ? 'admin' : 'vip'
    }
  },
})
