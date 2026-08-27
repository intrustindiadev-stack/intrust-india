import { z } from 'zod';

export const plpQuerySchema = z.object({
  size: z.string().optional(),
  fit: z.string().optional(),
  color: z.string().optional(),
  fabric: z.string().optional(),
  price: z.string().optional(), // format: "min-max"
  discount: z.string().optional(),
  sort: z.enum(['newest', 'price-asc', 'price-desc', 'relevance']).optional().default('newest'),
  page: z.coerce.number().min(1).optional().default(1),
  view: z.enum(['grid', 'editorial']).optional().default('grid'),
});

export type PLPQuery = z.infer<typeof plpQuerySchema>;

export const categorySchema = z.object({
  id: z.string(),
  parent_id: z.string().nullable(),
  level: z.number(),
  name: z.string(),
  title: z.string(),
  slug: z.string(),
  path: z.string(),
  description: z.string().nullable(),
  banner_url: z.string().nullable(),
  banner_alt: z.string().nullable(),
  filter_presets: z.any().nullable(),
  seo_schema: z.any().nullable(),
  sort_order: z.number(),
  is_visible: z.boolean(),
});

export type CategoryMetadata = z.infer<typeof categorySchema>;
