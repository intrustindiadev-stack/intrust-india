## Context

In production, Next.js calls to the Omniflow WhatsApp API occasionally fail due to transient connection timeouts:
`TypeError: fetch failed` with underlying cause `ConnectTimeoutError: Connect Timeout Error (attempted address: whatsapp.ominiflow.com:443, timeout: 10000ms)`
The SMS flow incorporates `retryWithBackoff` to handle transient network glitches. However, the WhatsApp OTP flow inside `lib/notifications/otpWhatsapp.js` makes a single fetch attempt without retries. When that single request fails, the entire login or signup flow is blocked.

## Goals / Non-Goals

**Goals:**
- Implement a robust retry mechanism using the existing `retryWithBackoff` utility in `lib/notifications/otpWhatsapp.js` to absorb transient connection timeouts to `https://whatsapp.ominiflow.com`.
- Improve error logging by logging warning details of each failed retry attempt (excluding OTP codes for security).

**Non-Goals:**
- Modifying the template parameters or changing the approved WhatsApp OTP template components (which are already verified and correct).
- Replacing the global `fetch` configuration or modifying Node.js/system DNS resolution settings.

## Decisions

### Decision 1: Use `retryWithBackoff` from `lib/authHelpers.js`
- **Option A (Chosen):** Import and use the existing `retryWithBackoff` function inside `sendWhatsAppOtp` in `lib/notifications/otpWhatsapp.js`.
  - *Rationale:* Reuses tested utility code, aligns perfectly with the SMS flow retry behavior, and supports exponential backoff.
- **Option B:** Implement custom retry logic directly inside `lib/notifications/otpWhatsapp.js`.
  - *Rationale:* Adds duplicate code and increases maintenance overhead.

## Risks / Trade-offs

- **Risk:** High network latency from multiple retry attempts could delay the client response.
  - *Mitigation:* Cap `maxRetries` at 3 and initial `delay` at 500ms so that the absolute maximum wait time is within reasonable bounds (~3.5 seconds total across retries).
