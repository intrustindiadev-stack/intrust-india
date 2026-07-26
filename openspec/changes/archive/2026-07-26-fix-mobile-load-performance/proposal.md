## Why

The application currently experiences a severe white screen flash and long main-thread lockups on initial load on Android and lower-tier devices. During client hydration in `AuthContext.jsx`, initial render is blocked until an asynchronous network request (`fetchProfile`) completes, and missing Next.js loading boundaries across admin, CRM, HRM, and customer portals result in blank screen renders during server data fetching.

## What Changes

- **Non-Blocking Auth Hydration**: Modify `lib/contexts/AuthContext.jsx` to immediately release the loading lock (`setLoading(false)`) once an initial Supabase session JWT is read from cookies/storage, decoupling the slow Postgres `user_profiles` network fetch from initial layout rendering.
- **Next.js Route Segment Loading Boundaries**: Add dedicated `loading.jsx` skeleton screens with React Suspense boundaries to core portals (`app/(hrm)/loading.jsx`, `app/(crm)/loading.jsx`, and `app/(customer)/(protected)/dashboard/loading.jsx`) to ensure immediate layout paint instead of a white flash.
- **Code Splitting & Dynamic Imports**: Convert heavy below-the-fold and client-side interactive libraries (charting, carousels, modals, and heavy tables in customer dashboard and portal pages) to `next/dynamic` imports with `{ ssr: false }` and fallback skeleton loaders to relieve initial main-thread CPU pressure on mobile devices.

## Capabilities

### New Capabilities
- `mobile-load-optimization`: Establishes requirements for non-blocking auth hydration, mandatory route segment loading screens (`loading.jsx`), and code-splitting of heavy interactive UI libraries to maintain fast, responsive mobile initial renders.

### Modified Capabilities


## Impact

- **Authentication State (`lib/contexts/AuthContext.jsx`)**: Changes auth context initialization to set `loading: false` optimistically once user session is known, avoiding network-dependent UI render locks.
- **Route Layouts & Portals**: Enhances `app/(hrm)`, `app/(crm)`, and `app/(customer)/(protected)/dashboard` by adding root loading segment components.
- **Dashboard & Heavy UI Pages**: Refactors imports in `app/(customer)/(protected)/dashboard/page.jsx` and related heavy interactive panels to use lightweight dynamic code splitting.
