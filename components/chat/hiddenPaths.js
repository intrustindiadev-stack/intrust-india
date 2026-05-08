/**
 * components/chat/hiddenPaths.js
 *
 * Single source of truth for routes where the chat bubble and chat window
 * must NOT appear.
 *
 * Rationale for each group:
 *
 * AUTH FLOWS — user is not logged in, chat requires auth
 *   /login, /signup, /forgot-password, /reset-password, /verify
 *
 * INTERNAL PANELS — not customer-facing; these panels have their own support flows
 *   /admin, /hrm, /crm, /merchant, /employee
 *
 * Removed from the old list (chat IS useful there):
 *   /shop/cart           — customers often want help during checkout
 *   /shop/product        — customers ask about product details
 *   /customer/orders     — customers ask about order status
 *   /customer/nfc-service — customers ask about NFC card applications
 *   /merchant/purchase, /merchant/shopping/orders — merchant flows now in panel
 */
export const CHAT_HIDDEN_PATHS = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/verify',
  '/admin',
  '/hrm',
  '/crm',
  '/merchant',
  '/employee',
];

export const MERCHANT_CHAT_HIDDEN_PATHS = [
  '/merchant-status/pending',
  '/merchant-status/rejected',
  '/merchant-status/suspended',
  '/merchant-apply',
];
