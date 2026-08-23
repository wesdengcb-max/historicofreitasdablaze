import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/vip-login')({
  beforeLoad: () => {
    throw redirect({ to: '/' })
  },
  component: () => null
})