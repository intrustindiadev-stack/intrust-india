## Why

The "New Hire Pending Approval" notification sent to Admins contains a `reference_type` of `'hire_approval'`. Currently, the global `NotificationBell` component does not have a routing case for this reference type, meaning clicking the notification fails to redirect the Admin anywhere.

## What Changes

- Update `NotificationBell.jsx` to map the `hire_approval` notification reference type to the `/admin/careers` dashboard.
- Assign a relevant icon to the notification (e.g., `person_add` or `badge`).

## Capabilities

### New Capabilities

- `hire-approval-routing`: Handling the routing for the `hire_approval` notification reference type.

### Modified Capabilities

- None.

## Impact

- **Affected Code**: `components/notifications/NotificationBell.jsx`.
- **User Experience**: Admins can now seamlessly click the notification to jump to the careers dashboard and grant panel access roles.
