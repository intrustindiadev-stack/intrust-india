## 1. Non-Blocking Authentication Hydration

- [x] 1.1 Refactor `lib/contexts/AuthContext.jsx` in `initializeAuth()` to set `loading` to `false` immediately upon verifying initial user session, avoiding render blocking during asynchronous PostgreSQL profile retrieval.
- [x] 1.2 Update profile retrieval in `onAuthStateChange` to update user state silently without blocking layout render transitions.

## 2. React Suspense & Next.js Skeleton Route Boundaries

- [x] 2.1 Create responsive layout skeleton loader in `app/(hrm)/loading.jsx` with themed pulse animations to eliminate white flash during HR portal navigation and hydration.
- [x] 2.2 Create responsive layout skeleton loader in `app/(crm)/loading.jsx` with themed pulse animations to eliminate white flash during CRM portal navigation and hydration.
- [x] 2.3 Create responsive dashboard skeleton loader in `app/(customer)/(protected)/dashboard/loading.jsx` to guarantee instantaneous initial layout paint during server navigation.

## 3. Code Splitting & Dynamic Bundle Optimizations

- [x] 3.1 Refactor imports in `app/(customer)/(protected)/dashboard/page.jsx` to dynamically load below-the-fold and interactive components (`AdBannerCarousel`, `ReferralGenzSection`, `SolarPromoCard`, `RecentShoppingOrders`, `FeatureAdvertiser`) using `next/dynamic` with `{ ssr: false }` and dimensional placeholder skeletons.
- [x] 3.2 Verify bundle efficiency and layout stability, ensuring resolution of main-thread CPU lockups on Android mobile device viewports.
