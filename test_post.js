const { z } = require('zod');
const SERVICE_STATUSES = ['interested', 'pitched', 'negotiating', 'won', 'lost'];
const createServiceSchema = z.object({
    lead_id: z.string().uuid(),
    service_name: z.string().min(1).max(150),
    status: z.enum(SERVICE_STATUSES).default('interested'),
    deal_value: z.number().min(0).optional().default(0),
});

const body = {
    lead_id: '0c11475b-50e9-428a-8b35-123456789012',
    service_name: 'E-commerce',
    status: 'interested'
};
const parsed = createServiceSchema.safeParse(body);
console.log(JSON.stringify(parsed));
