import { z } from 'zod';

// Indian mobile: 10 digits, starting with 6-9 (e.g. 9876543210)
export const phoneRegex = /^[6-9]\d{9}$/;
export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizePhone(rawPhone?: string | null): string | null {
    if (!rawPhone) return null;
    const trimmed = rawPhone.toString().trim();
    if (!trimmed) return null;
    
    // Extract digits only
    const digits = trimmed.replace(/\D/g, '');
    
    // 10 digits starting with 6-9 -> canonical Indian mobile
    if (digits.length === 10 && /^[6-9]\d{9}$/.test(digits)) {
        return digits;
    }
    // 12 digits starting with 91 followed by 6-9xxxxxxxxx (+91 format)
    if (digits.length === 12 && digits.startsWith('91') && /^[6-9]\d{9}$/.test(digits.slice(2))) {
        return digits.slice(2);
    }
    // 11 digits starting with 0 followed by 6-9xxxxxxxxx (09876543210 format)
    if (digits.length === 11 && digits.startsWith('0') && /^[6-9]\d{9}$/.test(digits.slice(1))) {
        return digits.slice(1);
    }
    
    // Return raw trimmed value so strict regex validation can catch invalid formats
    return trimmed;
}

export function normalizeEmail(rawEmail?: string | null): string | null {
    if (!rawEmail) return null;
    const trimmed = rawEmail.toString().trim();
    return trimmed ? trimmed.toLowerCase() : null;
}

export const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'] as const;
export const LEAD_TEMPERATURES = ['hot', 'warm', 'cold'] as const;

export const CrmLeadCreateSchema = z.object({
    contact_name: z.string().min(1, 'Contact name is required').max(100, 'Contact name is too long'),
    title: z.string().max(150, 'Title is too long').optional().or(z.literal('')),
    phone: z.string()
        .refine(val => !val || phoneRegex.test(val), { message: 'Invalid 10-15 digit phone number' })
        .nullable()
        .optional()
        .or(z.literal('')),
    email: z.string()
        .refine(val => !val || emailRegex.test(val), { message: 'Invalid email address' })
        .nullable()
        .optional()
        .or(z.literal('')),
    source: z.string().max(100, 'Source is too long').optional().or(z.literal('')),
    status: z.enum(LEAD_STATUSES).default('new'),
    temperature: z.enum(LEAD_TEMPERATURES).default('warm'),

    notes: z.string().max(2000, 'Notes are too long').optional().or(z.literal('')),
    assigned_to: z.string().uuid().nullable().optional().or(z.literal('')),
    state: z.string().max(100, 'State name is too long').optional().or(z.literal('')),
    city: z.string().max(100, 'City name is too long').optional().or(z.literal('')),
    area: z.string().max(150, 'Area name is too long').optional().or(z.literal('')),
    zone: z.string().max(100, 'Zone name is too long').optional().or(z.literal('')),
    pincode: z.string().refine(val => !val || /^[1-9][0-9]{5}$/.test(val), { message: 'Invalid 6-digit PIN code' }).optional().or(z.literal('')),
});

export const CrmLeadUpdateSchema = CrmLeadCreateSchema.partial().extend({
    id: z.string().uuid('Invalid Lead ID').optional(),
});

export const CrmLeadCsvRowSchema = z.object({
    contact_name: z.string().min(1, 'Missing contact name'),
    title: z.string().optional(),
    phone: z.preprocess(
        (val) => (typeof val === 'string' ? normalizePhone(val) : val),
        z.string().refine(val => !val || phoneRegex.test(val), 'Invalid phone — must be a 10-digit Indian mobile starting with 6-9').nullable().optional()
    ),
    email: z.preprocess(
        (val) => (typeof val === 'string' ? normalizeEmail(val) : val),
        z.string().refine(val => !val || emailRegex.test(val), 'Invalid email format').nullable().optional()
    ),
    source: z.string().optional(),
    notes: z.string().optional(),
    state: z.string().optional(),
    city: z.string().optional(),
    area: z.string().optional(),
    zone: z.string().optional(),
    pincode: z.string().optional(),
    source_system: z.string().optional(),
    external_lead_id: z.string().optional(),
});

export const CrmTaskCreateSchema = z.object({
    lead_id: z.string().uuid('Invalid Lead ID'),
    title: z.string().min(1, 'Task title is required').max(200, 'Title is too long'),
    description: z.string().max(1000, 'Description is too long').optional().or(z.literal('')),
    due_date: z.string().refine(val => !isNaN(Date.parse(val)), 'Invalid due date'),
    assigned_to: z.string().uuid('Invalid assignee ID').optional().or(z.literal('')),
    status: z.enum(['pending', 'completed']).default('pending'),
});

export const CrmActivityLogSchema = z.object({
    lead_id: z.string().uuid('Invalid Lead ID'),
    actor_id: z.string().uuid('Invalid Actor ID'),
    action_type: z.string().min(1, 'Activity type is required'),
    details: z.string().max(1000, 'Details are too long').optional(),
});

export const CrmIntentLogSchema = z.object({
    lead_id: z.string().uuid('Invalid Lead ID'),
    service_name: z.string().min(1, 'Service name is required').max(150),
    // Must match crm_lead_services status CHECK constraint
    status: z.enum(['interested', 'pitched', 'negotiating', 'won', 'lost']).default('interested'),
});

export const LeadFilterSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(200).default(20),
    search: z.string().max(100).optional().default(''),
    status: z.union([z.string(), z.array(z.string())]).optional(),
    assignee: z.union([z.string(), z.array(z.string())]).optional(),
    source: z.union([z.string(), z.array(z.string())]).optional(),
    temperature: z.union([z.string(), z.array(z.string())]).optional(),
    sort: z.enum(['newest', 'oldest', 'recently_updated', 'name_asc', 'next_followup']).default('newest'),
    fromDate: z.string().datetime().optional(),
    toDate: z.string().datetime().optional(),
    includeArchived: z.coerce.boolean().default(false),
    team_id: z.string().uuid().optional(),
    pincode: z.string().optional(),
    zone: z.string().optional(),
    area_type: z.enum(['pincode', 'zone', 'area', 'city', 'state']).optional(),
    routing_status: z.enum(['unmatched', 'auto_matched', 'manual_override', 'reroute_pending']).optional(),
    service: z.string().optional(),
});

export const BulkAssignSchema = z.object({
    selectAllMatching: z.boolean().default(false),
    explicitIds: z.array(z.string().uuid('Invalid UUID')).max(5000).default([]),
    excludedIds: z.array(z.string().uuid('Invalid UUID')).max(5000).default([]),
    newRepId: z.string().uuid('Invalid rep ID').nullable(),
    filters: LeadFilterSchema.optional(),
});

export const serviceAreaBulkSchema = z.array(z.object({
    area_type: z.enum(['pincode', 'zone', 'area', 'city', 'state']),
    value: z.string().min(1, 'Value required'),
    city: z.string().optional(),
    state: z.string().optional(),
}));
