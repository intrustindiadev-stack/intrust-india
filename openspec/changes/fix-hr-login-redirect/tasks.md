## 1. Implementation

- [x] 1.1 Open `app/page.js`.
- [x] 1.2 Locate the existing redirect checks for `admin` and `merchant`.
- [x] 1.3 Add a redirect condition for `profile?.role === 'hr_manager'` pointing to `/hrm`.
- [x] 1.4 Add a redirect condition for `profile?.role?.startsWith('sales_') || profile?.role === 'sales_agent'` pointing to `/crm`.
- [x] 1.5 Add a redirect condition for `profile?.role === 'employee'` pointing to `/employee`.

## 2. Verification

- [x] 2.1 Verify that an HR user is successfully redirected to `/hrm` when visiting `/`.
- [x] 2.2 Verify that the `admin` and `merchant` redirects remain unaffected.
