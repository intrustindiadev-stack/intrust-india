-- 20260827000000_fashion_categories.sql

CREATE TABLE IF NOT EXISTS public.fashion_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES public.fashion_categories(id) ON DELETE SET NULL,
    level INTEGER NOT NULL,
    name TEXT NOT NULL,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    path TEXT NOT NULL UNIQUE,
    description TEXT,
    banner_url TEXT,
    banner_alt TEXT,
    filter_presets JSONB,
    seo_schema JSONB,
    sort_order INTEGER DEFAULT 0,
    is_visible BOOLEAN DEFAULT true,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fashion_categories_parent_id ON public.fashion_categories(parent_id);

CREATE TABLE IF NOT EXISTS public.fashion_product_categories (
    product_id UUID NOT NULL REFERENCES public.shopping_products(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.fashion_categories(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,
    PRIMARY KEY (product_id, category_id)
);

CREATE TABLE IF NOT EXISTS public.fashion_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.shopping_products(id) ON DELETE CASCADE,
    sku TEXT UNIQUE NOT NULL,
    color TEXT,
    size TEXT,
    fit TEXT,
    fabric TEXT,
    price_paise BIGINT NOT NULL,
    compare_at_price_paise BIGINT,
    inventory_quantity INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fashion_variants_color ON public.fashion_variants(color);
CREATE INDEX IF NOT EXISTS idx_fashion_variants_size ON public.fashion_variants(size);
CREATE INDEX IF NOT EXISTS idx_fashion_variants_product ON public.fashion_variants(product_id);

CREATE TABLE IF NOT EXISTS public.fashion_variant_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id UUID NOT NULL REFERENCES public.fashion_variants(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    alt_text TEXT,
    display_order INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_fashion_variant_media_variant ON public.fashion_variant_media(variant_id);

-- RLS
ALTER TABLE public.fashion_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fashion_product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fashion_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fashion_variant_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view visible categories" ON public.fashion_categories FOR SELECT USING (is_visible = true);
CREATE POLICY "Public can view product category links" ON public.fashion_product_categories FOR SELECT USING (true);
CREATE POLICY "Public can view active variants" ON public.fashion_variants FOR SELECT USING (is_active = true);
CREATE POLICY "Public can view variant media" ON public.fashion_variant_media FOR SELECT USING (true);

-- Admin policies
CREATE POLICY "Service role manages fashion categories" ON public.fashion_categories FOR ALL TO service_role USING (true);
CREATE POLICY "Service role manages fashion product categories" ON public.fashion_product_categories FOR ALL TO service_role USING (true);
CREATE POLICY "Service role manages fashion variants" ON public.fashion_variants FOR ALL TO service_role USING (true);
CREATE POLICY "Service role manages fashion variant media" ON public.fashion_variant_media FOR ALL TO service_role USING (true);

-- Permissions
GRANT SELECT ON public.fashion_categories TO anon, authenticated;
GRANT SELECT ON public.fashion_product_categories TO anon, authenticated;
GRANT SELECT ON public.fashion_variants TO anon, authenticated;
GRANT SELECT ON public.fashion_variant_media TO anon, authenticated;

-- Function for updated_at
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_fashion_categories_modtime
    BEFORE UPDATE ON public.fashion_categories
    FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
