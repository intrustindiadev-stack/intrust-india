## Context

When users load the Next.js frontend on Android devices or lower-tier hardware, they experience a severe white screen flash and JavaScript main-thread locking. This delay occurs because:
1. `AuthContext.jsx` currently blocks client render by remaining in `loading: true` state while waiting for a remote PostgreSQL query (`fetchProfile`) to complete over network connections.
2. Next.js App Router layouts (`app/(hrm)`, `app/(crm)`, and customer dashboard pages) lack dedicated `loading.jsx` skeleton boundaries, causing the framework to suppress visual rendering during server data access.
3. Complex interactive client components (e.g., charts, carousels, modals, marketing banners) in pages like `app/(customer)/(protected)/dashboard/page.jsx` are bundled directly into the primary javascript payload, causing CPU throttling during initial parsing and script hydration on Android mobile processors.

## Goals / Non-Goals

**Goals:**
- Eliminate the initial white screen flash on Android devices and low-tier hardware across all frontend routes.
- Refactor `AuthContext.jsx` so that token reading from storage instantly releases the render blocking state (`loading: false`), executing user profile fetching asynchronously in the background.
- Introduce native Next.js segment loaders (`loading.jsx`) with themed, high-aesthetic skeleton screens for CRM, HRM, and Customer portals.
- Convert heavy non-critical UI components (modals, promotional banners, charting panels) in customer and admin views to Next.js dynamic imports (`next/dynamic` with `{ ssr: false }`).

**Non-Goals:**
- Replacing existing authentication mechanisms (Supabase SSR JWT cookies remain unchanged).
- Rewriting backend database queries or altering schema layouts for user profiles or orders.

## Decisions

1. **Optimistic Auth State Release in `AuthContext.jsx`**
   - *Decision*: In `initializeAuth()`, as soon as `supabase.auth.getSession()` resolves with a valid local JWT session, immediately invoke `setUser(session.user)` and set `loading` to `false` *before* invoking `fetchProfile(session.user.id)`.
   - *Rationale*: Retrieving the local JWT session takes single-digit milliseconds without network waiting. Decoupling UI rendering from the database profile query prevents network latency from freezing layout rendering. Components needing specific role parameters can evaluate `profile === null` with targeted inline loading states rather than freezing the global root screen.

2. **Route Segment Skeleton Loading via `loading.jsx`**
   - *Decision*: Add `loading.jsx` components utilizing Tailwind CSS pulse animation structures matched to existing portal theme aesthetics in `app/(hrm)/loading.jsx`, `app/(crm)/loading.jsx`, and `app/(customer)/(protected)/dashboard/loading.jsx`.
   - *Rationale*: Next.js App Router utilizes React Suspense implicitly when a `loading.jsx` file is present in a route folder. This enables instantaneous Initial Layout Paint directly from server streams while data fetching proceeds asynchronously.

3. **Client-Side Code Splitting via `next/dynamic`**
   - *Decision*: Convert static imports of heavyweight below-the-fold or conditional UI components in `app/(customer)/(protected)/dashboard/page.jsx` (such as `AdBannerCarousel`, `ReferralGenzSection`, `SolarPromoCard`, `RecentShoppingOrders`, `FeatureAdvertiser`) into lazy evaluated chunks using `dynamic(() => import(...), { ssr: false, loading: () => <Skeleton /> })`.
   - *Rationale*: Reducing initial main bundle parsing footprint prevents main-thread CPU lockup on constrained mobile devices during hydration.

## Risks / Trade-offs

- **[Risk] UI Flicker during Profile Hydration** → If a user renders before their profile completes loading, role-dependent UI items (like admin badges or specific role portals) might display a default customer state momentarily.
  *Mitigation*: Maintain role routing protection inside `middleware.js` (which parses JWT metadata instantaneously from cookies before layout render) and preserve graceful skeleton states inside role-specific layout wrappers.
- **[Risk] Layout Shift from Dynamic Component Loading** → Dynamically loading carousels or cards could cause Cumulative Layout Shift (CLS) when chunks resolve.
  *Mitigation*: Provide dimensionally accurate skeleton loaders in the `loading: () => <div className="..." />` option of each dynamic import statement.
