-- Migration: Enterprise Product Rating & Review System
-- File: supabase/migrations/20260913000000_product_reviews_system.sql

-- 1. Add aggregate rating columns to shopping_products
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'shopping_products' AND column_name = 'avg_rating'
    ) THEN
        ALTER TABLE public.shopping_products ADD COLUMN avg_rating numeric(2,1) DEFAULT 0.0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'shopping_products' AND column_name = 'review_count'
    ) THEN
        ALTER TABLE public.shopping_products ADD COLUMN review_count integer DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'shopping_products' AND column_name = 'rating_1_count'
    ) THEN
        ALTER TABLE public.shopping_products ADD COLUMN rating_1_count integer DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'shopping_products' AND column_name = 'rating_2_count'
    ) THEN
        ALTER TABLE public.shopping_products ADD COLUMN rating_2_count integer DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'shopping_products' AND column_name = 'rating_3_count'
    ) THEN
        ALTER TABLE public.shopping_products ADD COLUMN rating_3_count integer DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'shopping_products' AND column_name = 'rating_4_count'
    ) THEN
        ALTER TABLE public.shopping_products ADD COLUMN rating_4_count integer DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'shopping_products' AND column_name = 'rating_5_count'
    ) THEN
        ALTER TABLE public.shopping_products ADD COLUMN rating_5_count integer DEFAULT 0;
    END IF;
END $$;

-- 2. Create product_reviews table
CREATE TABLE IF NOT EXISTS public.product_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.shopping_products(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title TEXT CHECK (title IS NULL OR length(title) <= 120),
    comment TEXT CHECK (comment IS NULL OR length(comment) <= 2000),
    media_urls TEXT[] DEFAULT '{}' CHECK (media_urls IS NULL OR array_length(media_urls, 1) IS NULL OR array_length(media_urls, 1) <= 4),
    verified_purchase BOOLEAN NOT NULL DEFAULT false,
    helpful_votes INTEGER NOT NULL DEFAULT 0 CHECK (helpful_votes >= 0),
    status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'hidden', 'pending_moderation')),
    order_group_id UUID REFERENCES public.shopping_order_groups(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT product_reviews_product_user_unique UNIQUE (product_id, user_id)
);

-- 3. Create review_replies table (one official reply per review)
CREATE TABLE IF NOT EXISTS public.review_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL REFERENCES public.product_reviews(id) ON DELETE CASCADE UNIQUE,
    merchant_id UUID REFERENCES public.merchants(id) ON DELETE CASCADE,
    replied_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    reply_text TEXT NOT NULL CHECK (length(reply_text) >= 1 AND length(reply_text) <= 1000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Create review_helpful_votes table
CREATE TABLE IF NOT EXISTS public.review_helpful_votes (
    review_id UUID NOT NULL REFERENCES public.product_reviews(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (review_id, user_id)
);

-- 5. Indexes for high performance
CREATE INDEX IF NOT EXISTS idx_product_reviews_prod_status_created 
    ON public.product_reviews(product_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_product_reviews_prod_status_helpful 
    ON public.product_reviews(product_id, status, helpful_votes DESC);

CREATE INDEX IF NOT EXISTS idx_product_reviews_prod_status_rating 
    ON public.product_reviews(product_id, status, rating);

CREATE INDEX IF NOT EXISTS idx_product_reviews_user_id 
    ON public.product_reviews(user_id);

CREATE INDEX IF NOT EXISTS idx_review_replies_review_id 
    ON public.review_replies(review_id);

CREATE INDEX IF NOT EXISTS idx_review_helpful_votes_review_id 
    ON public.review_helpful_votes(review_id);

-- 6. Trigger for updated_at
CREATE OR REPLACE FUNCTION public.set_reviews_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_product_reviews_updated_at ON public.product_reviews;
CREATE TRIGGER trg_product_reviews_updated_at
    BEFORE UPDATE ON public.product_reviews
    FOR EACH ROW
    EXECUTE FUNCTION public.set_reviews_updated_at();

DROP TRIGGER IF EXISTS trg_review_replies_updated_at ON public.review_replies;
CREATE TRIGGER trg_review_replies_updated_at
    BEFORE UPDATE ON public.review_replies
    FOR EACH ROW
    EXECUTE FUNCTION public.set_reviews_updated_at();

-- 7. Trigger to recompute product rating aggregates
CREATE OR REPLACE FUNCTION public.refresh_product_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_target_product_ids UUID[];
    v_prod_id UUID;
    v_count INTEGER;
    v_avg NUMERIC(2,1);
    v_r1 INTEGER;
    v_r2 INTEGER;
    v_r3 INTEGER;
    v_r4 INTEGER;
    v_r5 INTEGER;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_target_product_ids := ARRAY[NEW.product_id];
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.product_id <> OLD.product_id THEN
            v_target_product_ids := ARRAY[OLD.product_id, NEW.product_id];
        ELSE
            v_target_product_ids := ARRAY[NEW.product_id];
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        v_target_product_ids := ARRAY[OLD.product_id];
    END IF;

    FOREACH v_prod_id IN ARRAY v_target_product_ids LOOP
        SELECT 
            COUNT(*),
            COALESCE(ROUND(AVG(rating)::numeric, 1), 0.0),
            COUNT(*) FILTER (WHERE rating = 1),
            COUNT(*) FILTER (WHERE rating = 2),
            COUNT(*) FILTER (WHERE rating = 3),
            COUNT(*) FILTER (WHERE rating = 4),
            COUNT(*) FILTER (WHERE rating = 5)
        INTO 
            v_count,
            v_avg,
            v_r1,
            v_r2,
            v_r3,
            v_r4,
            v_r5
        FROM public.product_reviews
        WHERE product_id = v_prod_id AND status = 'published';

        UPDATE public.shopping_products
        SET 
            avg_rating = v_avg,
            review_count = v_count,
            rating_1_count = v_r1,
            rating_2_count = v_r2,
            rating_3_count = v_r3,
            rating_4_count = v_r4,
            rating_5_count = v_r5,
            updated_at = now()
        WHERE id = v_prod_id;
    END LOOP;

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_refresh_product_rating ON public.product_reviews;
CREATE TRIGGER trg_refresh_product_rating
    AFTER INSERT OR UPDATE OR DELETE ON public.product_reviews
    FOR EACH ROW
    EXECUTE FUNCTION public.refresh_product_rating();

-- 8. RPC: get_product_review_summary
CREATE OR REPLACE FUNCTION public.get_product_review_summary(p_product_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_summary JSONB;
BEGIN
    SELECT jsonb_build_object(
        'avg_rating', COALESCE(ROUND(AVG(rating)::numeric, 1), 0.0),
        'review_count', COUNT(*),
        'histogram', jsonb_build_object(
            '5', COUNT(*) FILTER (WHERE rating = 5),
            '4', COUNT(*) FILTER (WHERE rating = 4),
            '3', COUNT(*) FILTER (WHERE rating = 3),
            '2', COUNT(*) FILTER (WHERE rating = 2),
            '1', COUNT(*) FILTER (WHERE rating = 1)
        ),
        'verified_count', COUNT(*) FILTER (WHERE verified_purchase = true),
        'with_media_count', COUNT(*) FILTER (WHERE media_urls IS NOT NULL AND cardinality(media_urls) > 0)
    ) INTO v_summary
    FROM public.product_reviews
    WHERE product_id = p_product_id AND status = 'published';

    RETURN COALESCE(v_summary, jsonb_build_object(
        'avg_rating', 0.0,
        'review_count', 0,
        'histogram', jsonb_build_object('5', 0, '4', 0, '3', 0, '2', 0, '1', 0),
        'verified_count', 0,
        'with_media_count', 0
    ));
END;
$$;

-- 9. RPC: get_product_reviews (Paginated, filtered, joined with author and replies)
CREATE OR REPLACE FUNCTION public.get_product_reviews(
    p_product_id UUID,
    p_sort TEXT DEFAULT 'recent',
    p_page INTEGER DEFAULT 1,
    p_limit INTEGER DEFAULT 10,
    p_min_rating INTEGER DEFAULT NULL,
    p_verified_only BOOLEAN DEFAULT false,
    p_with_media BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_page INTEGER := GREATEST(COALESCE(p_page, 1), 1);
    v_limit INTEGER := LEAST(GREATEST(COALESCE(p_limit, 10), 1), 50);
    v_offset INTEGER := (v_page - 1) * v_limit;
    v_caller_id UUID := auth.uid();
    v_total_count INTEGER;
    v_reviews JSONB;
BEGIN
    -- Compute total matching reviews count
    SELECT COUNT(*) INTO v_total_count
    FROM public.product_reviews pr
    WHERE pr.product_id = p_product_id
      AND pr.status = 'published'
      AND (p_min_rating IS NULL OR pr.rating = p_min_rating)
      AND (NOT p_verified_only OR pr.verified_purchase = true)
      AND (NOT p_with_media OR (pr.media_urls IS NOT NULL AND cardinality(pr.media_urls) > 0));

    -- Select paginated rows
    SELECT jsonb_agg(review_row) INTO v_reviews
    FROM (
        SELECT jsonb_build_object(
            'id', pr.id,
            'product_id', pr.product_id,
            'user_id', pr.user_id,
            'rating', pr.rating,
            'title', pr.title,
            'comment', pr.comment,
            'media_urls', pr.media_urls,
            'verified_purchase', pr.verified_purchase,
            'helpful_votes', pr.helpful_votes,
            'status', pr.status,
            'created_at', pr.created_at,
            'updated_at', pr.updated_at,
            'has_voted_helpful', CASE 
                WHEN v_caller_id IS NULL THEN false
                ELSE EXISTS (
                    SELECT 1 FROM public.review_helpful_votes rhv 
                    WHERE rhv.review_id = pr.id AND rhv.user_id = v_caller_id
                )
            END,
            'user_profile', jsonb_build_object(
                'full_name', COALESCE(up.full_name, 'Verified Customer'),
                'avatar_url', up.avatar_url
            ),
            'reply', (
                SELECT jsonb_build_object(
                    'id', rr.id,
                    'merchant_id', rr.merchant_id,
                    'reply_text', rr.reply_text,
                    'created_at', rr.created_at,
                    'merchant_name', COALESCE(m.business_name, 'InTrust Official Seller')
                )
                FROM public.review_replies rr
                LEFT JOIN public.merchants m ON m.id = rr.merchant_id
                WHERE rr.review_id = pr.id
                LIMIT 1
            )
        ) AS review_row
        FROM public.product_reviews pr
        LEFT JOIN public.user_profiles up ON up.id = pr.user_id
        WHERE pr.product_id = p_product_id
          AND pr.status = 'published'
          AND (p_min_rating IS NULL OR pr.rating = p_min_rating)
          AND (NOT p_verified_only OR pr.verified_purchase = true)
          AND (NOT p_with_media OR (pr.media_urls IS NOT NULL AND cardinality(pr.media_urls) > 0))
        ORDER BY 
            CASE WHEN p_sort = 'helpful' THEN pr.helpful_votes END DESC NULLS LAST,
            CASE WHEN p_sort = 'highest' THEN pr.rating END DESC,
            CASE WHEN p_sort = 'lowest' THEN pr.rating END ASC,
            CASE WHEN p_sort = 'verified' THEN pr.verified_purchase END DESC NULLS LAST,
            pr.created_at DESC
        OFFSET v_offset
        LIMIT v_limit
    ) sub;

    RETURN jsonb_build_object(
        'reviews', COALESCE(v_reviews, '[]'::jsonb),
        'total_count', v_total_count,
        'page', v_page,
        'limit', v_limit,
        'has_more', (v_offset + v_limit) < v_total_count
    );
END;
$$;

-- 10. RPC: toggle_review_helpful
CREATE OR REPLACE FUNCTION public.toggle_review_helpful(p_review_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_review RECORD;
    v_voted BOOLEAN;
    v_new_votes INTEGER;
BEGIN
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required to vote' USING ERRCODE = '40100';
    END IF;

    SELECT id, user_id, helpful_votes INTO v_review
    FROM public.product_reviews
    WHERE id = p_review_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Review not found' USING ERRCODE = '40400';
    END IF;

    IF v_review.user_id = v_caller_id THEN
        RAISE EXCEPTION 'Cannot vote on your own review' USING ERRCODE = '40300';
    END IF;

    -- Check if vote exists
    IF EXISTS (
        SELECT 1 FROM public.review_helpful_votes 
        WHERE review_id = p_review_id AND user_id = v_caller_id
    ) THEN
        -- Remove vote
        DELETE FROM public.review_helpful_votes 
        WHERE review_id = p_review_id AND user_id = v_caller_id;

        UPDATE public.product_reviews
        SET helpful_votes = GREATEST(0, helpful_votes - 1)
        WHERE id = p_review_id
        RETURNING helpful_votes INTO v_new_votes;

        v_voted := false;
    ELSE
        -- Add vote
        INSERT INTO public.review_helpful_votes (review_id, user_id)
        VALUES (p_review_id, v_caller_id)
        ON CONFLICT DO NOTHING;

        UPDATE public.product_reviews
        SET helpful_votes = helpful_votes + 1
        WHERE id = p_review_id
        RETURNING helpful_votes INTO v_new_votes;

        v_voted := true;
    END IF;

    RETURN jsonb_build_object(
        'helpful_votes', v_new_votes,
        'voted', v_voted
    );
END;
$$;

-- 11. Row Level Security
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_helpful_votes ENABLE ROW LEVEL SECURITY;

-- Product Reviews RLS
DROP POLICY IF EXISTS "Public can view published reviews" ON public.product_reviews;
CREATE POLICY "Public can view published reviews" ON public.product_reviews
    FOR SELECT
    USING (
        status = 'published' 
        OR auth.uid() = user_id 
        OR public.is_admin()
        OR EXISTS (
            SELECT 1 FROM public.merchants m
            WHERE m.user_id = auth.uid()
              AND (
                  EXISTS (SELECT 1 FROM public.shopping_products sp WHERE sp.id = product_reviews.product_id AND sp.submitted_by_merchant_id = m.id)
                  OR EXISTS (SELECT 1 FROM public.merchant_inventory mi WHERE mi.product_id = product_reviews.product_id AND mi.merchant_id = m.id)
              )
        )
    );

DROP POLICY IF EXISTS "Authenticated users can insert own reviews" ON public.product_reviews;
CREATE POLICY "Authenticated users can insert own reviews" ON public.product_reviews
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own reviews or admin moderate" ON public.product_reviews;
CREATE POLICY "Users can update own reviews or admin moderate" ON public.product_reviews
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id OR public.is_admin())
    WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users can delete own reviews or admin" ON public.product_reviews;
CREATE POLICY "Users can delete own reviews or admin" ON public.product_reviews
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id OR public.is_admin());

-- Review Replies RLS
DROP POLICY IF EXISTS "Public can view replies to visible reviews" ON public.review_replies;
CREATE POLICY "Public can view replies to visible reviews" ON public.review_replies
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.product_reviews pr 
            WHERE pr.id = review_replies.review_id 
              AND (pr.status = 'published' OR pr.user_id = auth.uid())
        )
        OR public.is_admin()
        OR EXISTS (
            SELECT 1 FROM public.merchants m 
            WHERE m.id = review_replies.merchant_id AND m.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Merchants or admin can insert replies" ON public.review_replies;
CREATE POLICY "Merchants or admin can insert replies" ON public.review_replies
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_admin()
        OR EXISTS (
            SELECT 1 FROM public.merchants m 
            WHERE m.id = review_replies.merchant_id AND m.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Merchants or admin can update replies" ON public.review_replies;
CREATE POLICY "Merchants or admin can update replies" ON public.review_replies
    FOR UPDATE
    TO authenticated
    USING (
        public.is_admin()
        OR EXISTS (
            SELECT 1 FROM public.merchants m 
            WHERE m.id = review_replies.merchant_id AND m.user_id = auth.uid()
        )
    )
    WITH CHECK (
        public.is_admin()
        OR EXISTS (
            SELECT 1 FROM public.merchants m 
            WHERE m.id = review_replies.merchant_id AND m.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Merchants or admin can delete replies" ON public.review_replies;
CREATE POLICY "Merchants or admin can delete replies" ON public.review_replies
    FOR DELETE
    TO authenticated
    USING (
        public.is_admin()
        OR EXISTS (
            SELECT 1 FROM public.merchants m 
            WHERE m.id = review_replies.merchant_id AND m.user_id = auth.uid()
        )
    );

-- Review Helpful Votes RLS
DROP POLICY IF EXISTS "Authenticated users can select helpful votes" ON public.review_helpful_votes;
CREATE POLICY "Authenticated users can select helpful votes" ON public.review_helpful_votes
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert own helpful vote" ON public.review_helpful_votes;
CREATE POLICY "Authenticated users can insert own helpful vote" ON public.review_helpful_votes
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated users can delete own helpful vote" ON public.review_helpful_votes;
CREATE POLICY "Authenticated users can delete own helpful vote" ON public.review_helpful_votes
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- 12. Storage Bucket setup for review media
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'review-media', 
    'review-media', 
    true, 
    5242880, 
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE SET 
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

-- Storage RLS Policies
DROP POLICY IF EXISTS "Public read review media" ON storage.objects;
CREATE POLICY "Public read review media" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'review-media');

DROP POLICY IF EXISTS "Authenticated users can upload review media" ON storage.objects;
CREATE POLICY "Authenticated users can upload review media" ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'review-media' 
        AND (storage.foldername(name))[1] = 'reviews'
    );

DROP POLICY IF EXISTS "Users can delete own review media" ON storage.objects;
CREATE POLICY "Users can delete own review media" ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'review-media' 
        AND (auth.uid() = owner OR public.is_admin())
    );

-- 13. Grants
GRANT ALL ON public.product_reviews TO anon, authenticated, service_role;
GRANT ALL ON public.review_replies TO anon, authenticated, service_role;
GRANT ALL ON public.review_helpful_votes TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.get_product_review_summary(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_product_reviews(UUID, TEXT, INTEGER, INTEGER, INTEGER, BOOLEAN, BOOLEAN) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.toggle_review_helpful(UUID) TO authenticated, service_role;
