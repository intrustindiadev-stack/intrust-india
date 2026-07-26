## Context

Currently, `middleware.js` verifies JWT session cookies to gate access to the `/employee` portal. If an admin removes a user's role in the database, the local JWT remains stale until expiration (up to 1 hour) or a manual logout, leaving a security vulnerability. 

## Goals / Non-Goals

**Goals:**
- Implement a server-side check on the `/employee` layout that fetches the true, real-time role of the user from the database.
- If the true role doesn't match the required `employee` role, instantly boot them from the portal.

**Non-Goals:**
- Completely rewriting the authentication flow or removing `middleware.js` checks (middleware remains as a fast first-pass filter).
- Extending this check to every single page. (Putting it in `app/employee/layout.js` handles the entire portal efficiently).

## Decisions

- **Decision 1:** Add the live check to `app/employee/layout.js` utilizing `supabase.auth.getUser()` or checking `public.user_profiles` directly.
  - *Rationale*: A Next.js server-side layout runs securely on the server and caches effectively. If `getUser()` or a profile query indicates a non-employee role, we can `redirect('/')` to evict them.

- **Decision 2:** Perform forceful logout (optional) vs simple redirect.
  - *Rationale*: We'll simply redirect them to their correct dashboard path (e.g. `portalForRole(userRole)` equivalent or `/`) which gracefully handles the UX without clearing valid auth tokens they might still need for their downgraded role.

## Risks / Trade-offs

- **Risk:** Added latency on layout load.
  - **Mitigation:** Only done once per layout load. Supabase queries are fast, and `getUser()` checks the Supabase auth server directly which is optimal.
