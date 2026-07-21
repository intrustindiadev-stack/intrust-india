## Context

Currently, `app/page.js` checks the authenticated user's profile and performs automated redirects to the correct portal but only for `admin` and `merchant` roles. As new internal portals were added (`/hrm` for HR, `/crm` for Sales, and `/employee` for regular staff), these redirection rules were not updated. Consequently, these users remain on the landing page (`/`) after login or upon directly visiting the root URL.

## Goals / Non-Goals

**Goals:**
- Provide an automatic redirection from the root landing page (`/`) to the correct portal for all internal roles.
- Ensure that `hr_manager` is redirected to `/hrm`.
- Ensure that `sales_exec`, `sales_agent`, and roles starting with `sales_` are redirected to `/crm`.
- Ensure that `employee` is redirected to `/employee`.

**Non-Goals:**
- Restricting access logic (authorization middleware). This change only deals with routing convenience on the root landing page, not securing the actual portals.
- Changing redirection rules for `admin` and `merchant`, which are already functioning correctly.

## Decisions

**1. Modify Server Component Root Logic**
- The redirection checks are currently located in the `app/page.js` Server Component, fetching the profile from Supabase and issuing a `redirect()` from `next/navigation`.
- *Rationale*: We will append the new role checks directly inside this block. It's efficient, runs on the server, and uses the exact same pattern already established for `admin` and `merchant`.

## Risks / Trade-offs

- **Risk**: Role mismatches or typos in string comparisons.
  - *Mitigation*: We will reuse exact string checks mimicking `lib/auth.js` (`role === 'hr_manager'`, `role.startsWith('sales_')`, etc.).
