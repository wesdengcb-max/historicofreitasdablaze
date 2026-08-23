---
title: Token-Based VIP Area Access
author: Lovable
date: 2026-08-23
---

# VIP Area Access Refactoring

Implement a token-based access system for the VIP area while keeping the homepage public and the admin area secure.

## Changes

### Database
- Create `public.vip_tokens` table if not exists.
  - Columns: `id`, `token` (unique), `member_name`, `status` (active/inactive/expired), `expires_at`, `created_at`, `updated_at`.
  - Enable RLS and grant access.

### Backend (Server Functions)
- **`src/lib/vip.functions.ts`**:
  - `validateToken`: Verifies token against DB and sets a secure `httpOnly` cookie for session persistence.
  - `checkVipSession`: Checks if the current session has a valid VIP cookie.
  - `listVipTokens`, `createVipToken`, `updateVipToken`, `deleteVipToken`: Admin-only functions for token management.

### Authentication & Routing
- **`src/routes/index.tsx`**: Remove existing `beforeLoad` redirect to allow public access.
- **`src/routes/_authenticated.tsx`**: Update layout to support both Supabase Auth (for Admin) and Token Auth (for VIP).
- **`src/components/TopNav.tsx`**: Modify the "Área VIP" link to trigger a token entry modal or redirect to a new `/vip-login` route.
- **`src/routes/vip-login.tsx`**: New route for token entry.

### Admin Dashboard
- **`src/routes/admin.index.tsx`**: Add a new tab or section for "VIP Tokens" management.
- Implement UI for generating, activating, and revoking tokens.

## Technical Details
- Use standard Web Request/Response cookies in server functions.
- Tokens will be generated in format `FW-XXXX-XXXX`.
- VIP session status will be synced via a client-side store (Zustand) for UI reactivity.
