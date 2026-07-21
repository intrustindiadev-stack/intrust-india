## Why

When an internal user (such as an HR Manager, CRM agent, or general Employee) logs into the application and subsequently visits the root domain (`/`), they are left on the landing page instead of being automatically redirected to their respective portal. Currently, `app/page.js` only handles root-level redirection for `admin` and `merchant` roles. This creates friction for staff who must manually type `/hrm` or `/crm` to access their dashboards if they return to the main site.

## What Changes

- Add automatic redirection rules for `hr_manager` to `/hrm`.
- Add automatic redirection rules for sales roles (e.g., `sales_exec`, `sales_agent`) to `/crm`.
- Add automatic redirection rules for `employee` to `/employee`.
- Ensure standard customers (users with no special role or the generic `user` role) are properly handled, either remaining on the landing page or being directed to `/dashboard` as intended by the product.

## Capabilities

### New Capabilities

- `internal-role-redirection`: Automatic root-level redirection logic based on user roles (`hr_manager`, `sales_*`, `employee`).

### Modified Capabilities

- None.

## Impact

- **Affected Code**: `app/page.js` (Server Component).
- **User Experience**: Internal staff will experience a seamless flow directly into their respective portals upon visiting the site while logged in.
