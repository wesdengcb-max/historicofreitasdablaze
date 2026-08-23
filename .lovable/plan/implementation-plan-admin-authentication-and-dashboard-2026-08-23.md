# Implementation Plan - Admin Authentication and Dashboard

The goal is to finalize the authentication system by adding a secure admin area (`/admin`) and user management capabilities. This will use Lovable Cloud (Supabase) for authentication and role-based access control.

## Proposed Changes

### Database and Security
- Create an `app_role` enum and a `user_roles` table in the database.
- Create a `has_role` security definer function to safely check user roles without recursion.
- Enable RLS on `user_roles` and configure policies.
- **Initial Admin Account**: Seed the first admin user (`admin@freitaswhite.com` / `admin87850424`) and assign the 'admin' role via SQL migration.

### Server Functions (Backend)
- **Admin Management API**:
    - `listUsers`: Retrieve a list of users with their roles and metadata (admin only).
    - `createUser`: Create new members via `supabaseAdmin` (admin only).
    - `updateUser`: Modify user details, roles, or status (admin only).
    - `deleteUser`: Remove users from the system (admin only).
- Move `supabaseAdmin` usage to a `.server.ts` file to ensure it never leaks to the client bundle.

### Routing and Layout
- **Auth Guard Updates**:
    - Update `src/routes/_authenticated.tsx` to handle role checks if needed (though global auth is enough for standard routes).
- **Admin Routes**:
    - Create `src/routes/_admin.tsx`: Layout route that gates access to users with the 'admin' role.
    - Create `src/routes/_admin/admin.tsx`: The main administrative dashboard.
    - Path will be `/admin`.

### Frontend Components
- **Admin Dashboard**:
    - User list with filtering and sorting.
    - User creation/edit modals.
    - Status toggles (active/inactive).
    - Role management.
- **Header/Sidebar**:
    - Show an "Admin Panel" link only for users with the 'admin' role.

## Technical Details

### User Roles Table Schema
```sql
create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    role app_role not null,
    unique (user_id, role)
);
```

### Security Definer Function
```sql
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;
```

### Admin Route Protection
`src/routes/_admin.tsx` will use `beforeLoad` to check `public.has_role(auth.uid(), 'admin')` before allowing navigation.

## Validation Plan
1. Test standard user login (`/auth`) and access to `/app`.
2. Test admin login (`/auth`) and access to `/admin`.
3. Verify that standard users receive a 403/Redirect when attempting to access `/admin`.
4. Verify user management functions (create, edit, toggle status) within the admin panel.
