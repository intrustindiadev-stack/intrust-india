import crypto from 'crypto';
import { hashOTP as legacyHashOTP } from './otpUtils.js';

export function hmacOTP(otp) {
  const pepper = process.env.OTP_PEPPER;
  if (!pepper) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('CRITICAL: OTP_PEPPER is not set in production. Refusing to downgrade to unsalted hash.');
    }
    console.warn('WARNING: OTP_PEPPER is unset. Downgrading to unsalted legacy hash.');
    return legacyHashOTP(otp);
  }
  return crypto.createHmac('sha256', pepper).update(otp).digest('hex');
}

export function verifyOTPHash(otp, storedHash, storedPepperHash) {
  if (storedPepperHash) {
    // Verify using HMAC
    return hmacOTP(otp) === storedPepperHash;
  }
  // Verify using legacy SHA-256
  return legacyHashOTP(otp) === storedHash;
}
