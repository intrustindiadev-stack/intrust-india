## 1. Retry Integration for WhatsApp OTP

- [x] 1.1 Import `retryWithBackoff` from `lib/authHelpers.js` in `lib/notifications/otpWhatsapp.js`
- [x] 1.2 Wrap the `sendTemplateMessage` call in `sendWhatsAppOtp` with the `retryWithBackoff` helper, configuring it for up to 3 retries with a 500ms initial delay
- [x] 1.3 Add descriptive warning logs in `lib/notifications/otpWhatsapp.js` during retry attempts to capture issues without logging the sensitive OTP code itself

## 2. Verification and Deployment

- [x] 2.1 Test sending a WhatsApp OTP locally to ensure the change does not break successful delivery flows
- [x] 2.2 Run local test suite to verify no regressions in SMS or other authentication routes
- [x] 2.3 Deploy the code to the production VPS and monitor PM2 logs for successful WhatsApp OTP delivery and correct backoff behaviors during transient connectivity dips
