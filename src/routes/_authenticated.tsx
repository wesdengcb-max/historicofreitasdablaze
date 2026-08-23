import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'
import { supabase } from '@/integrations/supabase/client'
import { useVipStore } from '@/lib/vipStore'

export const Route = createFileRoute('/_authenticated')({ 
  component: () => <Outlet />,
  beforeLoad: async ({ location }) => {
    // 1. Check if user is logged in via Supabase (Admin flow)
    const { data: { session } } = await supabase.auth.getSession()
    
    // 2. Check if user has a VIP token session (VIP flow)
    // Note: Since beforeLoad is a static check, we'll try to get the state from the store
    // On the server, this store will be empty, so we rely on the cookie-based session check
    // In TanStack Start, we might need a server function to check the cookie securely
    
    const isVip = typeof window !== 'undefined' ? useVipStore.getState().isVip : false;

    // If it's an admin route, strict Supabase auth is required
    if (location.pathname.startsWith('/admin')) {
      if (!session) {
        throw redirect({
          to: '/auth' as any,
          search: { redirect: location.href } as any,
        })
      }
      return { session, user: session.user, authType: 'admin' }
    }

    // For other authenticated routes (VIP area), either session OR VIP token works
    if (!session && !isVip) {
      // If neither, redirect to the VIP login/token page
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
