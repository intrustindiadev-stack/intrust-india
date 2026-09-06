import { z } from 'zod';

/**
 * Forgiving phone regex accepting:
 * - Standard 10-digit Indian numbers: 9876543210
 * - 10-digit with leading zero: 09876543210
 * - Country code with plus: +919876543210, +91 98765 43210, +91-9876543210
 * - International formats (10 to 14 numeric digits with optional leading +)
 */
export const phoneRegex = /^\+?[0-9\s\-]{10,14}$/;

/**
 * Validation schema for Delivery Address in checkout
 */
export const deliveryAddressSchema = z.object({
  fullName: z
    .string({ required_error: 'Full Name is required' })
    .trim()
    .min(2, 'Full Name must be at least 2 characters')
    .max(100, 'Full Name must be under 100 characters'),
  address: z
    .string({ required_error: 'Street Address is required' })
    .trim()
    .min(3, 'Street address must be at least 3 characters')
    .max(250, 'Street address must be under 250 characters'),
  city: z
    .string({ required_error: 'City is required' })
    .trim()
    .min(2, 'City is required')
    .max(100, 'City is too long'),
  state: z
    .string({ required_error: 'State is required' })
    .trim()
    .min(2, 'State is required')
    .max(100, 'State is too long'),
  pincode: z
    .string({ required_error: 'Pincode is required' })
    .trim()
    .regex(/^[1-9][0-9]{5}$/, 'Please enter a valid 6-digit PIN code'),
  phone: z
    .string({ required_error: 'Phone number is required' })
    .trim()
    .refine(
      (val) => phoneRegex.test(val),
      'Please enter a valid phone number (10 to 14 digits, e.g. 9876543210 or +91 9876543210)'
    )
});

/**
 * Sanitizes and normalizes phone numbers for database storage.
 * Ensures compatibility with PostgreSQL check constraint:
 *   CHECK (((phone IS NULL) OR (phone ~ '^\+?[1-9]\d{1,14}$'::text)))
 *
 * Handles:
 * - "09876543210" -> "+919876543210" (strips leading 0 and adds +91)
 * - "9876543210"  -> "+919876543210" (adds +91)
 * - "+91 98765 43210" -> "+919876543210" (removes spaces)
 * - "+91-98765-43210" -> "+919876543210" (removes dashes)
 * - "919876543210" -> "+919876543210" (adds +)
 */
export function sanitizeAndNormalizePhone(rawPhone) {
  if (!rawPhone || typeof rawPhone !== 'string') return null;

  const trimmed = rawPhone.trim();
  if (!trimmed) return null;

  const hasPlus = trimmed.startsWith('+');
  // Strip all non-digits
  const digitsOnly = trimmed.replace(/\D/g, '');

  if (digitsOnly.length < 10) {
    return null;
  }

  // 11 digits starting with 0 (Indian STD format e.g. 09876543210)
  if (digitsOnly.length === 11 && digitsOnly.startsWith('0')) {
    return '+91' + digitsOnly.slice(1);
  }

  // Exactly 10 digits -> Standard Indian mobile number
  if (digitsOnly.length === 10) {
    return '+91' + digitsOnly;
  }

  // 12 digits starting with 91 (e.g. 919876543210 without +)
  if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
    return '+' + digitsOnly;
  }

  // Already prefixed with +, preserve + and digits
  if (hasPlus) {
    return '+' + digitsOnly;
  }

  // Fallback: If starts with non-zero digit and 10-15 chars, prefix with +
  if (digitsOnly[0] !== '0') {
    return '+' + digitsOnly;
  }

  // If starts with 0 and length > 11, strip leading zeros
  const withoutLeadingZeros = digitsOnly.replace(/^0+/, '');
  if (withoutLeadingZeros.length >= 10) {
    return '+91' + withoutLeadingZeros.slice(-10);
  }

  return '+' + digitsOnly;
}
