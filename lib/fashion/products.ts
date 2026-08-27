import { createStaticSupabaseClient } from '../supabaseServer';
import { PLPQuery } from '../validation/fashion';

export type ProductVariant = {
  id: string;
  sku: string;
  color: string;
  size: string;
  fit: string;
  fabric: string;
  price_paise: number;
  compare_at_price_paise: number | null;
  inventory_quantity: number;
  media: { image_url: string; alt_text: string | null }[];
};

export type ProductSummary = {
  id: string;
  title: string;
  description: string;
  variants: ProductVariant[];
  base_price_paise: number;
};

export async function getProductsForCategory(
  categoryPath: string,
  query: PLPQuery
): Promise<{ data: ProductSummary[]; count: number }> {
  const supabase = createStaticSupabaseClient();
  const limit = 24;
  const offset = (query.page - 1) * limit;

  // We need to fetch products that have at least one category matching the path prefix.
  // We'll use the fashion_product_categories join table.
  // Supabase postgrest syntax for filtering on inner joined tables:
  let rpcQuery = supabase
    .from('shopping_products')
    .select(`
      id, title, description, suggested_retail_price_paise,
      fashion_product_categories!inner (
        fashion_categories!inner ( path )
      ),
      fashion_variants!inner (
        id, sku, color, size, fit, fabric, price_paise, compare_at_price_paise, inventory_quantity,
        fashion_variant_media ( image_url, alt_text, display_order )
      )
    `, { count: 'exact' })
    .eq('is_active', true)
    .like('fashion_product_categories.fashion_categories.path', `${categoryPath}%`);

  // Apply filters
  if (query.color) {
    const colors = query.color.split(',');
    rpcQuery = rpcQuery.in('fashion_variants.color', colors);
  }
  if (query.size) {
    const sizes = query.size.split(',');
    rpcQuery = rpcQuery.in('fashion_variants.size', sizes);
  }
  if (query.fit) {
    rpcQuery = rpcQuery.in('fashion_variants.fit', query.fit.split(','));
  }
  if (query.fabric) {
    rpcQuery = rpcQuery.in('fashion_variants.fabric', query.fabric.split(','));
  }
  if (query.price) {
    const [min, max] = query.price.split('-');
    if (min) rpcQuery = rpcQuery.gte('fashion_variants.price_paise', parseInt(min) * 100);
    if (max) rpcQuery = rpcQuery.lte('fashion_variants.price_paise', parseInt(max) * 100);
  }

  // Sorting
  if (query.sort === 'price-asc') {
    // Note: sorting by related table field in Supabase is limited without RPC.
    // For MVP, we'll order by the base product price.
    rpcQuery = rpcQuery.order('suggested_retail_price_paise', { ascending: true });
  } else if (query.sort === 'price-desc') {
    rpcQuery = rpcQuery.order('suggested_retail_price_paise', { ascending: false });
  } else {
    rpcQuery = rpcQuery.order('created_at', { ascending: false });
  }

  rpcQuery = rpcQuery.range(offset, offset + limit - 1);

  const { data, error, count } = await rpcQuery;

  if (error || !data) {
    console.error('getProductsForCategory Error:', error);
    return { data: [], count: 0 };
  }

  // Transform data to match ProductSummary
  const formattedData: ProductSummary[] = data.map((item: any) => {
    return {
      id: item.id,
      title: item.title,
      description: item.description,
      base_price_paise: item.suggested_retail_price_paise,
      variants: (item.fashion_variants || []).map((v: any) => ({
        id: v.id,
        sku: v.sku,
        color: v.color,
        size: v.size,
        fit: v.fit,
        fabric: v.fabric,
        price_paise: v.price_paise,
        compare_at_price_paise: v.compare_at_price_paise,
        inventory_quantity: v.inventory_quantity,
        media: v.fashion_variant_media?.sort((a: any, b: any) => a.display_order - b.display_order).map((m: any) => ({
          image_url: m.image_url,
          alt_text: m.alt_text
        })) || []
      }))
    };
  });

  return { data: formattedData, count: count || 0 };
}
