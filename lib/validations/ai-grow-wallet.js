// lib/validations/ai-grow-wallet.js
// Zod validation schema for AI Grow Wallet Adjustments

import { z } from 'zod';

export const adjustWalletSchema = z.object({
  merchant_id: z.string().uuid({ message: 'Invalid merchant ID format.' }),
  adjustment_type: z.enum(['credit', 'debit', 'admin_adjustment'], {
    errorMap: () => ({ message: 'Select a valid adjustment type.' }),
  }),
  amount: z
    .number({ invalid_type_error: 'Amount must be a number.' })
    .nonnegative({ message: 'Amount must be greater than or equal to 0.' }),
  reason: z
    .string()
    .trim()
    .min(10, { message: 'A detailed reason of at least 10 characters is required for audit logs.' })
    .max(500, { message: 'Reason cannot exceed 500 characters.' }),
});
