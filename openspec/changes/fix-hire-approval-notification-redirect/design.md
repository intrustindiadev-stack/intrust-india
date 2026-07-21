## Context

When an HR Manager marks a candidate as "Hired", an automated notification is dispatched to all Admins with the reference type `hire_approval`. However, the central `NotificationBell.jsx` component acts as the global router for all notifications. It currently lacks a switch case for this specific reference type, causing it to fall through to the default block (which does nothing).

## Goals / Non-Goals

**Goals:**
- Ensure clicking the "New Hire Pending Approval" notification navigates the Admin to `/admin/careers`.
- Apply a relevant material icon to the notification (e.g., `badge` or `how_to_reg`).

**Non-Goals:**
- Refactoring the entire notification routing architecture. We will simply add the missing switch case.

## Decisions

**1. Add switch case for `hire_approval`**
- In `handleNotificationClick()`, we will add `case 'hire_approval':` to route `isAdmin` to `/admin/careers`.
- In `typeIcon()`, we will map `hire_approval` to the `how_to_reg` or `person_add` material icon.
