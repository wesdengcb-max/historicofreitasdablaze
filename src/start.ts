import { QueryClient } from '@tanstack/react-query'
import { createStart } from '@tanstack/react-start'
import { attachSupabaseAuth } from '@/integrations/supabase/auth-attacher';

export const startInstance = createStart(() => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
      },
    },
  })

  return {
    queryClient,
    functionMiddleware: [attachSupabaseAuth],
  }
})
