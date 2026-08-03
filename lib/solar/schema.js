import { z } from 'zod';

const phoneRegex = /^[6-9]\d{9}$/;
const pincodeRegex = /^[1-9][0-9]{5}$/;

export const solarLeadSchema = z.object({
    name: z.string().min(2, 'Name is too short').max(100, 'Name is too long').trim(),
    mobile: z.string().regex(phoneRegex, 'Enter a valid 10-digit Indian mobile number'),
    email: z.string().email('Enter a valid email address').optional().or(z.literal('')),
    pincode: z.string().regex(pincodeRegex, 'Enter a valid 6-digit Indian PIN code'),
    city: z.string().min(2, 'City is required').max(100).trim(),
    address: z.string().max(500).optional().or(z.literal('')),
    monthly_bill_range: z.enum(['less_1500', '1500_2500', '2500_4000', '4000_8000', 'more_8000'], {
        required_error: 'Please select your monthly bill range',
    }),
    property_type: z.enum(['residential', 'commercial', 'industrial']),
    marketing_consent: z.boolean().default(false),
});
