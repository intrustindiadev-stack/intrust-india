import { createStaticSupabaseClient } from '../supabaseServer';
import { PLPQuery } from '../validation/fashion';

export type FacetResult = {
  colors: { value: string; count: number }[];
  sizes: { value: string; count: number }[];
  fits: { value: string; count: number }[];
  fabrics: { value: string; count: number }[];
};

export async function getFacetsForCategory(
  categoryPath: string,
  query: PLPQuery
): Promise<FacetResult> {
  const supabase = createStaticSupabaseClient();
  
  // To get accurate facet counts, we ideally use a database RPC or do live aggregation.
  // For the MVP without writing complex custom Postgres functions, we'll fetch all unique variants
  // for the matching products (limited to 1000 for safety) and aggregate in memory.
  // In a high-scale production env, this MUST be an RPC returning JSONB aggregated counts.

  let rpcQuery = supabase
    .from('shopping_products')
    .select(`
      fashion_product_categories!inner (
        fashion_categories!inner ( path )
      ),
      fashion_variants!inner (
        color, size, fit, fabric, price_paise
      )
    `)
    .eq('is_active', true)
    .like('fashion_product_categories.fashion_categories.path', `${categoryPath}%`)
    .limit(1000);

  // Apply filters (excluding the facet we are calculating, ideally, but for MVP we apply all to get reactive count of CURRENT result set)
  // Actually, standard PLP facets show count of results IF that facet is clicked. 
  // For simplicity, we just aggregate the results of the current filter state.
  if (query.price) {
    const [min, max] = query.price.split('-');
    if (min) rpcQuery = rpcQuery.gte('fashion_variants.price_paise', parseInt(min) * 100);
    if (max) rpcQuery = rpcQuery.lte('fashion_variants.price_paise', parseInt(max) * 100);
  }

  const { data, error } = await rpcQuery;
  
  const result: FacetResult = { colors: [], sizes: [], fits: [], fabrics: [] };
  if (error || !data) return result;

  const colorMap = new Map<string, number>();
  const sizeMap = new Map<string, number>();
  const fitMap = new Map<string, number>();
  const fabricMap = new Map<string, number>();

  for (const item of data as any) {
    for (const v of item.fashion_variants) {
      if (v.color) colorMap.set(v.color, (colorMap.get(v.color) || 0) + 1);
      if (v.size) sizeMap.set(v.size, (sizeMap.get(v.size) || 0) + 1);
      if (v.fit) fitMap.set(v.fit, (fitMap.get(v.fit) || 0) + 1);
      if (v.fabric) fabricMap.set(v.fabric, (fabricMap.get(v.fabric) || 0) + 1);
    }
  }

  const toArray = (map: Map<string, number>) => Array.from(map.entries()).map(([value, count]) => ({ value, count }));
  
  result.colors = toArray(colorMap).sort((a, b) => b.count - a.count);
  result.sizes = toArray(sizeMap).sort((a, b) => b.count - a.count);
  result.fits = toArray(fitMap).sort((a, b) => b.count - a.count);
  result.fabrics = toArray(fabricMap).sort((a, b) => b.count - a.count);

  return result;
}
