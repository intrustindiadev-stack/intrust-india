## 1. Implementation

- [x] 1.1 Open `components/notifications/NotificationBell.jsx`.
- [x] 1.2 Locate the `typeIcon` function and add a switch case for `hire_approval` to return the `how_to_reg` icon (or fallback to `person_add`).
- [x] 1.3 Locate the `handleNotificationClick` function.
- [x] 1.4 Add a switch case for `hire_approval` that performs `if (isAdmin) router.push('/admin/careers');`.

## 2. Verification

- [x] 2.1 Trigger or view an existing "New Hire Pending Approval" notification as an Admin.
- [x] 2.2 Click the notification and verify it successfully routes to `/admin/careers`.
