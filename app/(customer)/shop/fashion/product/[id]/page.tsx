import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabaseServer';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import FashionProductClient from '../../../../../../components/product/fashion-product-client';
import type { ProductSummary, ProductVariant } from '../../../../../../lib/fashion/products';

export default async function FashionProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createAdminClient();

  // Fetch the product
  const { data: product, error: productError } = await supabase
    .from('shopping_products')
    .select(`
      id, title, description, suggested_retail_price_paise,
      shopping_categories(id, name)
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (productError || !product) {
    return notFound();
  }

  // Fetch variants & similar products in parallel
  const [variantsResult, similarResult] = await Promise.all([
    supabase
      .from('fashion_variants')
      .select(`
        id, sku, size, color, fit, fabric, price_paise, compare_at_price_paise, inventory_quantity, is_active,
        fashion_variant_media(id, image_url, alt_text, sort_order)
      `)
      .eq('product_id', id)
      .eq('is_active', true)
      .order('sort_order', { referencedTable: 'fashion_variant_media', ascending: true }),

    supabase
      .from('shopping_products')
      .select(`
        id, title, description, slug, product_images, suggested_retail_price_paise, mrp_paise,
        fashion_product_categories!inner(category_id)
      `)
      .neq('id', id)
      .eq('is_active', true)
      .is('deleted_at', null)
      .limit(4)
  ]);

  const variants = variantsResult.data || [];
  const similarProducts = (similarResult.data || []).map((p: any) => ({
    id: p.id,
    title: p.title,
    price: (p.suggested_retail_price_paise || p.mrp_paise || 0) / 100,
    mrp_paise: p.mrp_paise,
    suggested_retail_price_paise: p.suggested_retail_price_paise,
    product_images: p.product_images,
    thumbnail: p.product_images?.[0],
    url: `/shop/fashion/product/${p.id}`,
    isFashion: true
  }));

  const mappedVariants: ProductVariant[] = variants.map((v: any) => ({
    ...v,
    media: v.fashion_variant_media || []
  }));

  const productSummary: ProductSummary = {
    id: product.id,
    title: product.title,
    description: product.description || '',
    base_price_paise: product.suggested_retail_price_paise || 0,
    variants: mappedVariants
  };

  return (
    <div className="min-h-screen bg-[#f7f8fa] dark:bg-[#080a10] font-[family-name:var(--font-outfit)]">
      <Navbar />
      <main className="pt-20 md:pt-24 pb-24">
        <FashionProductClient product={productSummary} similarProducts={similarProducts} />
      </main>
      <Footer />
    </div>
  );
}
