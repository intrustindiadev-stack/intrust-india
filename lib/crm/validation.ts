import { z } from 'zod';

// Indian mobile: 10 digits, starting with 6-9 (e.g. 9876543210)
export const phoneRegex = /^[6-9]\d{9}$/;
export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    deal_value: z.number().min(0, 'Deal value cannot be negative').default(0),
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
    phone: z.string().refine(val => !val || phoneRegex.test(val), 'Invalid phone — must be a 10-digit Indian mobile starting with 6-9').nullable().optional(),
    email: z.string().refine(val => !val || emailRegex.test(val), 'Invalid email format').nullable().optional(),
    source: z.string().optional(),
    notes: z.string().optional(),
    state: z.string().optional(),
    city: z.string().optional(),
    area: z.string().optional(),
    zone: z.string().optional(),
    pincode: z.string().optional(),
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
    deal_value: z.number().min(0, 'Deal value cannot be negative').default(0),
    status: z.enum(['pitched', 'negotiating', 'agreed', 'rejected']).default('pitched'),
});

export const LeadFilterSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(200).default(20),
    search: z.string().max(100).optional().default(''),
    status: z.union([z.string(), z.array(z.string())]).optional(),
    assignee: z.union([z.string(), z.array(z.string())]).optional(),
    source: z.union([z.string(), z.array(z.string())]).optional(),
    temperature: z.union([z.string(), z.array(z.string())]).optional(),
    sort: z.enum(['newest', 'oldest', 'recently_updated', 'name_asc', 'value_desc', 'value_asc', 'next_followup']).default('newest'),
    minDealValue: z.coerce.number().min(0).optional(),
    maxDealValue: z.coerce.number().min(0).optional(),
    fromDate: z.string().datetime().optional(),
    toDate: z.string().datetime().optional(),
    includeArchived: z.coerce.boolean().default(false),
    team_id: z.string().uuid().optional(),
    pincode: z.string().optional(),
    zone: z.string().optional(),
    area_type: z.enum(['pincode', 'zone', 'area', 'city', 'state']).optional(),
    routing_status: z.enum(['unmatched', 'auto_matched', 'manual_override', 'reroute_pending']).optional(),
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
