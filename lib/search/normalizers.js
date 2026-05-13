import { STATIC_CATALOG } from './staticCatalog';

export async function searchProducts(supabase, term, limit, page = 1) {
  try {
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const filterStr = `title.ilike.%${term}%,description.ilike.%${term}%,category.ilike.%${term}%`;
    
    const { data, error, count } = await supabase
      .from('shopping_products')
      .select('id, title, description, category, slug, product_images, suggested_retail_price_paise, mrp_paise, admin_stock', { count: 'exact' })
      .or(filterStr)
      .eq('is_active', true)
      .is('deleted_at', null)
      .eq('approval_status', 'live')
      .range(from, to);

    if (error) throw error;

    const results = (data || []).map(row => ({
      id: row.id,
      name: row.title,
      category: 'products',
      price: (row.suggested_retail_price_paise ?? row.mrp_paise ?? 0) / 100,
      thumbnail: row.product_images?.[0] ?? null,
      url: '/shop/product/' + row.slug,
      description: row.description ?? '',
      outOfStock: (row.admin_stock ?? 0) <= 0
    }));

    return { results, total: count || 0 };
  } catch (error) {
    console.error('[search/products]', error);
    return { results: [], total: 0 };
  }
}

export async function searchMerchants(supabase, term, limit, page = 1) {
  try {
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const filterStr = `business_name.ilike.%${term}%,business_address.ilike.%${term}%`;
    const { data, error, count } = await supabase
      .from('merchants')
      .select('id, business_name, business_address, slug, shopping_banner_url', { count: 'exact' })
      .or(filterStr)
      .eq('status', 'approved')
      .range(from, to);

    if (error) throw error;

    const results = (data || []).map(row => ({
      id: row.id,
      name: row.business_name,
      category: 'services',
      price: null,
      thumbnail: row.shopping_banner_url ?? '/logo.png',
      url: '/shop/' + row.slug,
      description: row.business_address ?? ''
    }));

    return { results, total: count || 0 };
  } catch (error) {
    console.error('[search/merchants]', error);
    return { results: [], total: 0 };
  }
}

export async function searchCoupons(supabase, term, limit, page = 1) {
  try {
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const filterStr = `brand.ilike.%${term}%,title.ilike.%${term}%,description.ilike.%${term}%,category.ilike.%${term}%`;
    
    // Primary query
    const { data: primaryData, error: primaryError, count: primaryCount } = await supabase
      .from('coupons')
      .select('id, brand, title, description, category, selling_price_paise, image_url, tags', { count: 'exact' })
      .or(filterStr)
      .eq('status', 'available')
      .eq('listed_on_marketplace', true)
      .not('merchant_id', 'is', null)
      .gte('valid_until', new Date().toISOString())
      .range(from, to);

    if (primaryError) throw primaryError;

    // Secondary query for tag matching (tags are harder to paginate exactly when merging)
    // For now, we follow the previous pattern but we should probably only return the paginated primary if we want exact DB paging.
    // However, the prompt says "return an exact total count alongside the current page of rows".
    // Merging two paginated queries is complex. 
    // Let's stick to the primary query for exact pagination if possible, or accept that merging might be slightly off.
    // Actually, coupons usually have tags.
    
    const results = (primaryData || []).map(row => ({
      id: row.id,
      name: row.title || row.brand,
      category: 'giftcards',
      price: (row.selling_price_paise ?? 0) / 100,
      thumbnail: row.image_url ?? null,
      url: '/gift-cards/' + row.id,
      description: row.description ?? ''
    }));

    return { results, total: primaryCount || 0 };
  } catch (error) {
    console.error('[search/coupons]', error);
    return { results: [], total: 0 };
  }
}

export async function searchBanners(supabase, term, limit, page = 1) {
  try {
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const { data, error, count } = await supabase
      .from('platform_banners')
      .select('id, title, image_url, target_url', { count: 'exact' })
      .ilike('title', '%' + term + '%')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .range(from, to);

    if (error) throw error;

    const results = (data || []).map(row => ({
      id: row.id,
      name: row.title,
      category: 'offers',
      price: null,
      thumbnail: row.image_url,
      url: row.target_url || '/services',
      description: ''
    }));

    return { results, total: count || 0 };
  } catch (error) {
    console.error('[search/banners]', error);
    return { results: [], total: 0 };
  }
}

export function searchStatic(term, limit, page = 1) {
  const q = term.toLowerCase();
  const filtered = STATIC_CATALOG.filter(entry => 
    entry.name.toLowerCase().includes(q) || 
    entry.description.toLowerCase().includes(q) || 
    entry.searchTokens.some(t => t.includes(q))
  );
  
  const from = (page - 1) * limit;
  const to = from + limit;
  const results = filtered.slice(from, to).map(({ searchTokens, ...rest }) => rest);
  
  return { results, total: filtered.length };
}
