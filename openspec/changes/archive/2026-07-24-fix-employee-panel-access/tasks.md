## 1. Implement Server-Side Role Validation

- [x] 1.1 Locate the main layout file for the employee portal (e.g., `app/employee/layout.js`).
- [x] 1.2 Import Supabase server client and Next.js `redirect` in the layout file.
- [x] 1.3 Add a server-side data fetching block using `supabase.auth.getUser()` or a query to `user_profiles`/`profiles` to fetch the user's real-time role.
- [x] 1.4 Add conditional logic to check if the returned real-time role equals `employee`.
- [x] 1.5 If the role is NOT `employee`, invoke `redirect('/dashboard')` (or `portalForRole` if applicable) to forcefully boot them out of the employee portal.

## 2. Testing & Verification

- [x] 2.1 Verify that a standard user with an `employee` JWT cookie is forcefully redirected when attempting to access `/employee`.
- [x] 2.2 Verify that a legitimate employee can still access the `/employee` portal without errors or infinite loops.
