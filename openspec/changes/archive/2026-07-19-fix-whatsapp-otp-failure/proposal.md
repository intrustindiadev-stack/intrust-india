## Why

Requesting a one-time password (OTP) via WhatsApp occasionally fails with a transient `ConnectTimeoutError` or network latency issue when calling the Omniflow API at `https://whatsapp.ominiflow.com`. Because the WhatsApp OTP flow lacks a retry mechanism (unlike the SMS flow), any single network timeout immediately aborts the OTP dispatch and displays the error message "Failed to send OTP. Please try again." to the user.

## What Changes

- Introduce a robust retry mechanism with exponential backoff for WhatsApp OTP dispatch in `lib/notifications/otpWhatsapp.js`, mirroring the retry logic already used in the SMS delivery client (`lib/smsClient.js`).
- Ensure fallback/safety logs capture detail about retry attempts to facilitate troubleshooting of API connectivity issues.

## Capabilities

### New Capabilities
- `whatsapp-otp-retry`: Retries WhatsApp OTP delivery up to 3 times with exponential backoff when encountering transient network or connection timeouts.

### Modified Capabilities
<!-- No requirement changes to existing specs. -->

## Impact

- `lib/notifications/otpWhatsapp.js`: Updated to import and use `retryWithBackoff` from `lib/authHelpers.js` during template dispatch.
- `lib/omniflow.js`: Add retry utility exports or context logging improvements if necessary.
