import { z } from 'zod';

export const phoneRegex = /^\+?[\d\s-]{10,15}$/;
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
});

export const CrmLeadUpdateSchema = CrmLeadCreateSchema.partial().extend({
    id: z.string().uuid('Invalid Lead ID').optional(),
});

export const CrmLeadCsvRowSchema = z.object({
    contact_name: z.string().min(1, 'Missing contact name'),
    title: z.string().optional(),
    phone: z.string().refine(val => !val || phoneRegex.test(val), 'Invalid phone format').nullable().optional(),
    email: z.string().refine(val => !val || emailRegex.test(val), 'Invalid email format').nullable().optional(),
    source: z.string().optional(),
    notes: z.string().optional(),
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
