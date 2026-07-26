## Why

The Next.js middleware relies exclusively on the stateless session token (JWT) to determine access to restricted portals (like `/employee`). If an admin changes a user's role or panel access in the database, the user's browser still holds a valid JWT with the old role until it expires or they explicitly log out. This creates a security and UX issue where users retain access to sensitive panels they shouldn't have access to, or are denied access to panels they were just granted access to.

## What Changes

- Introduce a real-time server-side access validation mechanism in the layout component of restricted portals (specifically the employee portal to start).
- The middleware will remain JWT-driven for performance, but the layout will query the database (via `supabase.auth.getUser()` or checking `public.user_profiles`) on load.
- If the live database role/panel access differs from the JWT role or denies access, the server will forcefully redirect the user to their appropriate dashboard and potentially trigger a session refresh.

## Capabilities

### New Capabilities
- `live-access-validation`: Introduce a layout-level server-side validation to re-verify panel access against the live database state, overriding the stale JWT cache.

### Modified Capabilities

- 

## Impact

- **Affected code**: `app/employee/layout.js` (or similar layout files for restricted portals), and potentially `lib/auth.js` for helper validation functions.
- **Performance**: A lightweight database query will be executed on layout load for restricted portals.
- **UX**: Immediate access revocation or granting without requiring users to manually log out and log back in.
