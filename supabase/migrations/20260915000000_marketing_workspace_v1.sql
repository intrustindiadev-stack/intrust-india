-- ==============================================================================
-- INTRUST MARKETING WORKSPACE V1 — DATABASE SCHEMA & STORED PROCEDURES
-- ==============================================================================

-- 1. GLOBAL MARKETING SETTINGS (Dynamic Admin Configuration)
CREATE TABLE IF NOT EXISTS public.marketing_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed dynamic default settings
INSERT INTO public.marketing_settings (key, value) VALUES 
('rewards_config', '{
    "daily_challenge_reward_paise": 2500,
    "campaign_share_bonus_paise": 5000,
    "product_promo_default_cashback_paise": 10000,
    "sponsorship_fee_paise": 99900,
    "questions_per_challenge": 10
}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 2. ADD PROMOTIONAL CASHBACK COLUMN TO SHOPPING PRODUCTS
ALTER TABLE public.shopping_products 
ADD COLUMN IF NOT EXISTS promo_cashback_paise BIGINT DEFAULT 10000;
ALTER TABLE public.shopping_products 
ADD COLUMN IF NOT EXISTS referral_cashback_paise BIGINT DEFAULT 10000;

-- 3. MARKETING SHARE LINKS
CREATE TABLE IF NOT EXISTS public.marketing_share_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_type TEXT NOT NULL CHECK (user_type IN ('merchant', 'customer', 'admin')),
    merchant_id UUID REFERENCES public.merchants(id) ON DELETE SET NULL,
    product_id UUID NULL, -- Nullable to allow general challenge & platform links
    product_type TEXT NOT NULL CHECK (product_type IN ('platform', 'merchant')),
    code VARCHAR(16) UNIQUE NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('whatsapp', 'instagram', 'facebook', 'direct')),
    clicks_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 1,
    registrations_count INTEGER DEFAULT 0,
    orders_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketing_share_links_code ON public.marketing_share_links(code);
CREATE INDEX IF NOT EXISTS idx_marketing_share_links_user ON public.marketing_share_links(user_id);

-- 4. MARKETING TRACKING EVENTS (Immutable Audit Log)
CREATE TABLE IF NOT EXISTS public.marketing_tracking_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    link_id UUID REFERENCES public.marketing_share_links(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('SHARE', 'CLICK', 'VIEW', 'REGISTER', 'ADD_TO_CART', 'ORDER', 'CUSTOMER_ACQUIRED')),
    visitor_ip TEXT,
    user_agent TEXT,
    session_id TEXT,
    converted_user_id UUID REFERENCES auth.users(id),
    order_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketing_tracking_link ON public.marketing_tracking_events(link_id);
CREATE INDEX IF NOT EXISTS idx_marketing_tracking_event_type ON public.marketing_tracking_events(event_type);

-- 5. DAILY CHALLENGE CATEGORIES
CREATE TABLE IF NOT EXISTS public.daily_challenge_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    icon_name TEXT NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed Categories (Including Indian Mythology & Heritage)
INSERT INTO public.daily_challenge_categories (slug, title, icon_name, description, sort_order) VALUES
('mythology-culture', 'Mythology & Culture', 'BookOpen', 'Explore the epics of Ramayana, Mahabharata, and rich Indian heritage.', 1),
('general-knowledge', 'General Knowledge', 'Globe', 'India and world trivia, geography, history, and achievements.', 2),
('business-brands', 'Business & Brands', 'Briefcase', 'Famous Indian enterprises, startups, commerce, and market leaders.', 3),
('technology', 'Technology', 'Cpu', 'Smartphones, software innovations, AI, space tech, and future tech.', 4),
('sports', 'Sports', 'Trophy', 'Cricket, Kabaddi, Olympics, and iconic athletic legends.', 5),
('entertainment', 'Entertainment', 'Film', 'Cinema, music, iconic Bollywood dialogues, and pop culture.', 6),
('food-lifestyle', 'Food & Lifestyle', 'Coffee', 'Indian cuisines, healthy living, wellness, and festive traditions.', 7),
('enterprise', 'Enterprise & Industry', 'Building2', 'Corporate giants, Indian unicorns, supply chain, innovation, and B2B commerce.', 8)
ON CONFLICT (slug) DO UPDATE SET 
    title = EXCLUDED.title,
    icon_name = EXCLUDED.icon_name,
    description = EXCLUDED.description,
    sort_order = EXCLUDED.sort_order;

-- 6. DAILY CHALLENGE QUESTIONS
CREATE TABLE IF NOT EXISTS public.daily_challenge_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES public.daily_challenge_categories(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    options JSONB NOT NULL,
    correct_option_index INTEGER NOT NULL CHECK (correct_option_index BETWEEN 0 AND 3),
    explanation TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_daily_challenge_questions_category ON public.daily_challenge_questions(category_id);

-- Seed 10 High Quality Mythology Questions
INSERT INTO public.daily_challenge_questions (category_id, question, options, correct_option_index, explanation)
SELECT 
    c.id,
    q.question,
    q.options::jsonb,
    q.correct_option_index,
    q.explanation
FROM public.daily_challenge_categories c
CROSS JOIN (VALUES
    ('In the Ramayana, what was the divine bow of Lord Shiva broken by Sri Rama called?', '["Gandiva", "Pinaka", "Sharanga", "Vijaya"]', 1, 'Pinaka was the celestial bow of Lord Shiva gifted to King Janaka of Mithila.'),
    ('Who was the celestial architect of the gods in Hindu mythology?', '["Vishwakarma", "Maya Danava", "Kubera", "Brihaspati"]', 0, 'Vishwakarma is celebrated as the divine architect and craftsman in Vedic literature.'),
    ('In the Mahabharata, who was the master archery and weaponry teacher for both Pandavas and Kauravas?', '["Guru Sandipani", "Sage Vashistha", "Guru Dronacharya", "Sage Gautama"]', 2, 'Guru Dronacharya trained the young princes of Hastinapur in military science.'),
    ('Which holy river is revered in Hindu belief as the daughter of the Sun God (Suryaputri)?', '["Ganga", "Godavari", "Yamuna", "Saraswati"]', 2, 'Yamuna is revered as the daughter of Surya and sister of Yama.'),
    ('Which mountain served as the churning rod during the Samudra Manthan (Churning of the Ocean)?', '["Mount Kailash", "Mount Mandara", "Mount Meru", "Mount Vindhya"]', 1, 'Mount Mandara was chosen to churn the ocean of milk during Samudra Manthan.'),
    ('What is the sacred conch shell belonging to Arjuna in the Kurukshetra war named?', '["Panchajanya", "Devadatta", "Anantavijaya", "Paundra"]', 1, 'Devadatta was blown by Arjuna, while Sri Krishna blew Panchajanya.'),
    ('Which revered sage composed the epic Ramayana in Sanskrit?', '["Sage Valmiki", "Sage Ved Vyasa", "Sage Agastya", "Sage Narada"]', 0, 'Sage Valmiki is revered as the Adi Kavi (the first poet) for authoring the Ramayana.'),
    ('Who is known as the god of wealth and treasurer of the heavens in Hindu tradition?', '["Indra", "Kubera", "Varuna", "Agni"]', 1, 'Kubera is the divine treasurer and Lord of Alakapuri.'),
    ('In the Ramayana, which divine bird sacrificed his life trying to rescue Devi Sita from Ravana?', '["Sampati", "Jatayu", "Garuda", "Sugriva"]', 1, 'Jatayu fought valiantly against Ravana and attained Moksha through Lord Rama.'),
    ('Which incarnation (Avatar) of Lord Vishnu is depicted as half-man and half-lion?', '["Varaha", "Vamana", "Narasimha", "Kurma"]', 2, 'Narasimha avatar appeared to protect Bhakta Prahlada and defeat Hiranyakashipu.')
) AS q(question, options, correct_option_index, explanation)
WHERE c.slug = 'mythology-culture'
ON CONFLICT DO NOTHING;

-- 7. DAILY CHALLENGE SPONSORSHIPS (Merchant Sponsored Day)
CREATE TABLE IF NOT EXISTS public.daily_challenge_sponsorships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sponsor_date DATE UNIQUE NOT NULL,
    merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
    product_ids JSONB DEFAULT '[]'::jsonb,
    campaign_message TEXT,
    fee_paise BIGINT NOT NULL DEFAULT 99900,
    status TEXT NOT NULL DEFAULT 'booked' CHECK (status IN ('booked', 'live', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_daily_challenge_sponsorships_date ON public.daily_challenge_sponsorships(sponsor_date);
CREATE INDEX IF NOT EXISTS idx_daily_challenge_sponsorships_merchant ON public.daily_challenge_sponsorships(merchant_id);

-- 8. DAILY CHALLENGE PLAYS (User Completion Log)
CREATE TABLE IF NOT EXISTS public.daily_challenge_plays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    challenge_date DATE NOT NULL DEFAULT CURRENT_DATE,
    category_id UUID REFERENCES public.daily_challenge_categories(id),
    score INTEGER NOT NULL DEFAULT 0,
    cashback_awarded_paise BIGINT NOT NULL DEFAULT 2500,
    completed_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, challenge_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_challenge_plays_user_date ON public.daily_challenge_plays(user_id, challenge_date);

-- 9. EXTEND MERCHANT TRANSACTIONS CHECK CONSTRAINT
DO $$
BEGIN
    ALTER TABLE public.merchant_transactions
        DROP CONSTRAINT IF EXISTS merchant_transactions_transaction_type_check;

    ALTER TABLE public.merchant_transactions
        ADD CONSTRAINT merchant_transactions_transaction_type_check
        CHECK (transaction_type = ANY (ARRAY[
            'purchase', 'sale', 'commission', 'wallet_topup', 'withdrawal',
            'udhari_payment', 'store_credit_payment', 'subscription', 'payout',
            'referral_reward', 'sale_earnings', 'sponsorship', 'daily_challenge_cashback', 'marketing_cashback'
        ]::text[]));
END $$;

-- 10. MARKETING TARGETS & MYSTERY MILESTONES
CREATE TABLE IF NOT EXISTS public.marketing_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    target_audience TEXT NOT NULL DEFAULT 'customer' CHECK (target_audience IN ('customer', 'merchant', 'all')),
    metric_type TEXT NOT NULL CHECK (metric_type IN ('share_links', 'quiz_streak', 'store_sales', 'referrals', 'custom')),
    target_value INTEGER NOT NULL DEFAULT 1,
    reward_type TEXT NOT NULL CHECK (reward_type IN ('cashback', 'physical_gift', 'mystery_box', 'badge')),
    reward_value_paise BIGINT DEFAULT 0,
    gift_name TEXT,
    gift_image_url TEXT,
    sort_order INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketing_targets_audience ON public.marketing_targets(target_audience);
CREATE INDEX IF NOT EXISTS idx_marketing_targets_active ON public.marketing_targets(is_active);

-- Seed Default Targets
INSERT INTO public.marketing_targets (title, description, target_audience, metric_type, target_value, reward_type, reward_value_paise, gift_name, sort_order)
VALUES 
('Share 5 InTrust Deals', 'Share 5 deals or challenge links with friends and customers.', 'customer', 'share_links', 5, 'cashback', 5000, NULL, 1),
('3-Day Challenge Streak', 'Complete daily quiz challenges 3 consecutive days in a row.', 'customer', 'quiz_streak', 3, 'cashback', 10000, NULL, 2),
('Mystery Tech Goodie Box', 'Acquire 10 customer referrals or verified store sales.', 'all', 'referrals', 10, 'physical_gift', 0, 'InTrust Smart Merchant Toolkit & Branded Wireless Gear', 3),
('Executive Milestone Tech Pack', 'Achieve 25 verified customer referrals or wholesale orders.', 'merchant', 'referrals', 25, 'physical_gift', 0, 'Executive Wireless Bluetooth Noise-Cancelling Kit', 4)
ON CONFLICT DO NOTHING;

-- 11. MARKETING TARGET CLAIMS & GIFT FULFILLMENT
CREATE TABLE IF NOT EXISTS public.marketing_target_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_id UUID REFERENCES public.marketing_targets(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_type TEXT NOT NULL CHECK (user_type IN ('customer', 'merchant', 'admin')),
    gift_title TEXT NOT NULL,
    recipient_name TEXT,
    recipient_phone TEXT,
    shipping_address TEXT,
    status TEXT NOT NULL DEFAULT 'earned' CHECK (status IN ('earned', 'processing', 'shipped', 'delivered', 'cancelled')),
    courier_name TEXT,
    tracking_number TEXT,
    tracking_url TEXT,
    notes TEXT,
    claimed_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketing_target_claims_user ON public.marketing_target_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_marketing_target_claims_status ON public.marketing_target_claims(status);

-- 12. EXTEND NOTIFICATIONS CONSTRAINT FOR MARKETING ALERTS
DO $$
BEGIN
    ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notification_type_check;
    ALTER TABLE public.notifications ADD CONSTRAINT notification_type_check 
        CHECK (type IN ('info', 'success', 'warning', 'error', 'marketing', 'reward', 'MARKETING', 'REWARD'));
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- 13. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.marketing_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_share_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_tracking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_challenge_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_challenge_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_challenge_sponsorships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_challenge_plays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_target_claims ENABLE ROW LEVEL SECURITY;

-- Policies: Marketing Settings
DROP POLICY IF EXISTS "Public read marketing_settings" ON public.marketing_settings;
CREATE POLICY "Public read marketing_settings" ON public.marketing_settings
    FOR SELECT USING (true);

-- Policies: Share Links
DROP POLICY IF EXISTS "Users can create share links" ON public.marketing_share_links;
CREATE POLICY "Users can create share links" ON public.marketing_share_links
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own share links" ON public.marketing_share_links;
CREATE POLICY "Users can view own share links" ON public.marketing_share_links
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public can view share link by code" ON public.marketing_share_links;
CREATE POLICY "Public can view share link by code" ON public.marketing_share_links
    FOR SELECT USING (true);

-- Policies: Tracking Events
DROP POLICY IF EXISTS "Public can record tracking events" ON public.marketing_tracking_events;
CREATE POLICY "Public can record tracking events" ON public.marketing_tracking_events
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view tracking events for their links" ON public.marketing_tracking_events;
CREATE POLICY "Users can view tracking events for their links" ON public.marketing_tracking_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.marketing_share_links l 
            WHERE l.id = marketing_tracking_events.link_id AND l.user_id = auth.uid()
        )
    );

-- Policies: Categories & Questions
DROP POLICY IF EXISTS "Public read categories" ON public.daily_challenge_categories;
CREATE POLICY "Public read categories" ON public.daily_challenge_categories
    FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Public read questions" ON public.daily_challenge_questions;
CREATE POLICY "Public read questions" ON public.daily_challenge_questions
    FOR SELECT USING (is_active = true);

-- Policies: Sponsorships
DROP POLICY IF EXISTS "Public read daily sponsorships" ON public.daily_challenge_sponsorships;
CREATE POLICY "Public read daily sponsorships" ON public.daily_challenge_sponsorships
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Merchants can insert sponsorships" ON public.daily_challenge_sponsorships;
CREATE POLICY "Merchants can insert sponsorships" ON public.daily_challenge_sponsorships
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.merchants m 
            WHERE m.id = daily_challenge_sponsorships.merchant_id AND m.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Merchants can update own sponsorships" ON public.daily_challenge_sponsorships;
CREATE POLICY "Merchants can update own sponsorships" ON public.daily_challenge_sponsorships
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.merchants m 
            WHERE m.id = daily_challenge_sponsorships.merchant_id AND m.user_id = auth.uid()
        )
    );

-- Policies: Plays
DROP POLICY IF EXISTS "Users view own plays" ON public.daily_challenge_plays;
CREATE POLICY "Users view own plays" ON public.daily_challenge_plays
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own play" ON public.daily_challenge_plays;
CREATE POLICY "Users insert own play" ON public.daily_challenge_plays
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policies: Targets
DROP POLICY IF EXISTS "Public read active targets" ON public.marketing_targets;
CREATE POLICY "Public read active targets" ON public.marketing_targets
    FOR SELECT USING (is_active = true);

-- Policies: Target Claims
DROP POLICY IF EXISTS "Users view own target claims" ON public.marketing_target_claims;
CREATE POLICY "Users view own target claims" ON public.marketing_target_claims
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own target claims" ON public.marketing_target_claims;
CREATE POLICY "Users insert own target claims" ON public.marketing_target_claims
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ─── Admin & Super Admin Full Control Policies ───
DROP POLICY IF EXISTS "Admins full control categories" ON public.daily_challenge_categories;
CREATE POLICY "Admins full control categories" ON public.daily_challenge_categories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
              AND user_profiles.role IN ('admin', 'super_admin')
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
              AND user_profiles.role IN ('admin', 'super_admin')
        )
    );

DROP POLICY IF EXISTS "Admins full control questions" ON public.daily_challenge_questions;
CREATE POLICY "Admins full control questions" ON public.daily_challenge_questions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
              AND user_profiles.role IN ('admin', 'super_admin')
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
              AND user_profiles.role IN ('admin', 'super_admin')
        )
    );

DROP POLICY IF EXISTS "Admins full control settings" ON public.marketing_settings;
CREATE POLICY "Admins full control settings" ON public.marketing_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
              AND user_profiles.role IN ('admin', 'super_admin')
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
              AND user_profiles.role IN ('admin', 'super_admin')
        )
    );

DROP POLICY IF EXISTS "Admins full control targets" ON public.marketing_targets;
CREATE POLICY "Admins full control targets" ON public.marketing_targets
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
              AND user_profiles.role IN ('admin', 'super_admin')
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
              AND user_profiles.role IN ('admin', 'super_admin')
        )
    );

DROP POLICY IF EXISTS "Admins full control target claims" ON public.marketing_target_claims;
CREATE POLICY "Admins full control target claims" ON public.marketing_target_claims
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
              AND user_profiles.role IN ('admin', 'super_admin')
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
              AND user_profiles.role IN ('admin', 'super_admin')
        )
    );

DROP POLICY IF EXISTS "Admins full control sponsorships" ON public.daily_challenge_sponsorships;
CREATE POLICY "Admins full control sponsorships" ON public.daily_challenge_sponsorships
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
              AND user_profiles.role IN ('admin', 'super_admin')
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
              AND user_profiles.role IN ('admin', 'super_admin')
        )
    );

DROP POLICY IF EXISTS "Admins view all tracking events" ON public.marketing_tracking_events;
CREATE POLICY "Admins view all tracking events" ON public.marketing_tracking_events
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
              AND user_profiles.role IN ('admin', 'super_admin')
        )
    );

DROP POLICY IF EXISTS "Admins view all share links" ON public.marketing_share_links;
CREATE POLICY "Admins view all share links" ON public.marketing_share_links
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
              AND user_profiles.role IN ('admin', 'super_admin')
        )
    );

DROP POLICY IF EXISTS "Admins view all challenge plays" ON public.daily_challenge_plays;
CREATE POLICY "Admins view all challenge plays" ON public.daily_challenge_plays
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
              AND user_profiles.role IN ('admin', 'super_admin')
        )
    );



-- ==============================================================================
-- VII. STORED PROCEDURES & BUSINESS LOGIC (ATOMIC FINANCES & WALLET CREDITS)
-- ==============================================================================

-- 1. RPC: book_daily_challenge_sponsorship (Merchant Only, Wallet or Gateway)
CREATE OR REPLACE FUNCTION public.book_daily_challenge_sponsorship(
    p_sponsor_date DATE,
    p_product_ids JSONB,
    p_campaign_message TEXT,
    p_payment_method TEXT DEFAULT 'wallet',
    p_client_txn_id TEXT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_merchant_id UUID;
    v_merchant_balance BIGINT;
    v_new_balance BIGINT;
    v_fee_paise BIGINT;
    v_booking_id UUID;
    v_user_id UUID := auth.uid();
BEGIN
    SELECT id, wallet_balance_paise INTO v_merchant_id, v_merchant_balance
    FROM public.merchants WHERE user_id = v_user_id;
    
    IF v_merchant_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Only verified merchants can sponsor challenges');
    END IF;

    -- Dynamic fee from marketing_settings
    SELECT (value->>'sponsorship_fee_paise')::BIGINT INTO v_fee_paise
    FROM public.marketing_settings WHERE key = 'rewards_config';
    v_fee_paise := COALESCE(v_fee_paise, 99900);

    IF p_sponsor_date <= CURRENT_DATE THEN
        RETURN jsonb_build_object('success', false, 'message', 'Sponsorship dates must be in the future');
    END IF;

    IF p_payment_method = 'wallet' AND v_merchant_balance < v_fee_paise THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient wallet balance to book sponsorship');
    END IF;

    -- Lock date (enforced by UNIQUE constraint on sponsor_date)
    INSERT INTO public.daily_challenge_sponsorships (
        sponsor_date, merchant_id, product_ids, campaign_message, fee_paise, status
    ) VALUES (
        p_sponsor_date, v_merchant_id, p_product_ids, p_campaign_message, v_fee_paise, 'booked'
    ) RETURNING id INTO v_booking_id;

    IF p_payment_method = 'wallet' THEN
        -- Deduct fee from merchant wallet atomically
        UPDATE public.merchants 
        SET wallet_balance_paise = wallet_balance_paise - v_fee_paise
        WHERE id = v_merchant_id
        RETURNING wallet_balance_paise INTO v_new_balance;

        -- Record transaction with correct schema
        INSERT INTO public.merchant_transactions (
            merchant_id, transaction_type, amount_paise, balance_after_paise, description, metadata
        ) VALUES (
            v_merchant_id, 'sponsorship', v_fee_paise, v_new_balance, 
            'Daily Challenge Sponsorship for ' || to_char(p_sponsor_date, 'DD Mon YYYY'),
            jsonb_build_object('booking_id', v_booking_id, 'sponsor_date', p_sponsor_date, 'payment_method', 'wallet')
        );
    ELSE
        -- SabPaisa / External Gateway settlement
        v_new_balance := v_merchant_balance;
        INSERT INTO public.merchant_transactions (
            merchant_id, transaction_type, amount_paise, balance_after_paise, description, metadata
        ) VALUES (
            v_merchant_id, 'sponsorship', v_fee_paise, v_new_balance, 
            'Daily Challenge Sponsorship (SabPaisa Gateway) for ' || to_char(p_sponsor_date, 'DD Mon YYYY'),
            jsonb_build_object('booking_id', v_booking_id, 'sponsor_date', p_sponsor_date, 'payment_method', 'sabpaisa', 'client_txn_id', p_client_txn_id)
        );
    END IF;

    -- Trigger in-app notification
    INSERT INTO public.notifications (
        user_id, title, body, type, reference_id, reference_type
    ) VALUES (
        v_user_id,
        'Sponsorship Confirmed! 🎉',
        'Your featured sponsorship for ' || to_char(p_sponsor_date, 'DD Mon YYYY') || ' is confirmed.',
        'info',
        v_booking_id,
        'sponsorship'
    );

    RETURN jsonb_build_object(
        'success', true, 
        'booking_id', v_booking_id,
        'fee_paise', v_fee_paise,
        'new_balance_paise', v_new_balance
    );
EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'message', 'This date is already booked by another merchant');
END;
$$;

-- 2. RPC: submit_daily_challenge (Dynamic Reward with Real Customer/Merchant Wallet Ledger)
CREATE OR REPLACE FUNCTION public.submit_daily_challenge(
    p_category_id UUID,
    p_score INTEGER
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_reward_paise BIGINT;
    v_user_role TEXT;
    v_merchant_id UUID;
    v_new_balance_paise BIGINT := 0;
    v_cust_wallet_id UUID;
    v_cust_bal_before BIGINT := 0;
    v_play_id UUID;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Authentication required');
    END IF;

    IF EXISTS (SELECT 1 FROM public.daily_challenge_plays WHERE user_id = v_user_id AND challenge_date = CURRENT_DATE) THEN
        RETURN jsonb_build_object('success', false, 'message', 'You have already completed today''s challenge');
    END IF;

    -- Dynamic reward from settings
    SELECT (value->>'daily_challenge_reward_paise')::BIGINT INTO v_reward_paise
    FROM public.marketing_settings WHERE key = 'rewards_config';
    v_reward_paise := COALESCE(v_reward_paise, 2500);

    INSERT INTO public.daily_challenge_plays (
        user_id, challenge_date, category_id, score, cashback_awarded_paise
    ) VALUES (
        v_user_id, CURRENT_DATE, p_category_id, p_score, v_reward_paise
    ) RETURNING id INTO v_play_id;

    SELECT role INTO v_user_role FROM public.user_profiles WHERE id = v_user_id;

    IF v_user_role = 'merchant' THEN
        SELECT id, wallet_balance_paise INTO v_merchant_id, v_cust_bal_before FROM public.merchants WHERE user_id = v_user_id;
        IF v_merchant_id IS NOT NULL THEN
            UPDATE public.merchants 
            SET wallet_balance_paise = wallet_balance_paise + v_reward_paise 
            WHERE id = v_merchant_id
            RETURNING wallet_balance_paise INTO v_new_balance_paise;

            INSERT INTO public.merchant_transactions (
                merchant_id, transaction_type, amount_paise, balance_after_paise, description, metadata
            ) VALUES (
                v_merchant_id, 'daily_challenge_cashback', v_reward_paise, v_new_balance_paise,
                'Daily Challenge Cashback Reward',
                jsonb_build_object('play_id', v_play_id, 'score', p_score)
            );
        END IF;
    ELSE
        -- Ensure Customer Wallet exists
        INSERT INTO public.customer_wallets (user_id, balance_paise)
        VALUES (v_user_id, 0)
        ON CONFLICT (user_id) DO NOTHING;

        SELECT id, balance_paise INTO v_cust_wallet_id, v_cust_bal_before
        FROM public.customer_wallets 
        WHERE user_id = v_user_id;

        v_new_balance_paise := v_cust_bal_before + v_reward_paise;

        UPDATE public.customer_wallets 
        SET balance_paise = v_new_balance_paise, updated_at = now()
        WHERE id = v_cust_wallet_id;

        INSERT INTO public.customer_wallet_transactions (
            wallet_id, user_id, type, amount_paise, balance_before_paise, balance_after_paise, description, reference_id, reference_type
        ) VALUES (
            v_cust_wallet_id, v_user_id, 'CREDIT', v_reward_paise, v_cust_bal_before, v_new_balance_paise,
            'Daily Challenge Reward Cashback', v_play_id::text, 'DAILY_CHALLENGE'
        );
    END IF;

    -- Send push notification
    INSERT INTO public.notifications (
        user_id, title, body, type, reference_id, reference_type
    ) VALUES (
        v_user_id,
        'Cashback Received! 💰',
        'You earned ₹' || (v_reward_paise / 100)::text || ' for completing today''s Daily Challenge quiz.',
        'success',
        v_play_id,
        'daily_challenge'
    );

    RETURN jsonb_build_object(
        'success', true, 
        'reward_paise', v_reward_paise,
        'new_balance_paise', v_new_balance_paise
    );
END;
$$;

-- 3. RPC: process_marketing_referral_reward (Registration & Product Referral Cashbacks)
CREATE OR REPLACE FUNCTION public.process_marketing_referral_reward(
    p_event_type TEXT,
    p_ref_code TEXT,
    p_converted_user_id UUID,
    p_product_id UUID DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_link RECORD;
    v_cashback_paise BIGINT := 0;
    v_referrer_role TEXT;
    v_product_cashback BIGINT;
    v_desc TEXT;
    v_merchant_balance BIGINT;
    v_cust_wallet_id UUID;
    v_cust_bal_before BIGINT := 0;
    v_new_balance BIGINT := 0;
BEGIN
    SELECT * INTO v_link FROM public.marketing_share_links WHERE code = p_ref_code;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid referral link code');
    END IF;

    IF p_event_type = 'SHARE' THEN
        UPDATE public.marketing_share_links 
        SET shares_count = shares_count + 1 
        WHERE id = v_link.id;

        INSERT INTO public.marketing_tracking_events (
            link_id, event_type, metadata
        ) VALUES (
            v_link.id, 'SHARE', jsonb_build_object('user_id', p_converted_user_id, 'product_id', p_product_id)
        );

        RETURN jsonb_build_object('success', true, 'message', 'Share recorded successfully');

    ELSIF p_event_type = 'REGISTER' THEN
        SELECT COALESCE((value->>'campaign_share_bonus_paise')::BIGINT, (value->>'referral_registration_bonus_paise')::BIGINT, 5000) INTO v_cashback_paise
        FROM public.marketing_settings WHERE key = 'rewards_config';
        v_cashback_paise := COALESCE(v_cashback_paise, 5000);
        v_desc := 'Campaign Link Sign-up Bonus';

        UPDATE public.marketing_share_links 
        SET registrations_count = registrations_count + 1 
        WHERE id = v_link.id;

    ELSIF p_event_type = 'ORDER' THEN
        IF p_product_id IS NOT NULL THEN
            SELECT COALESCE(promo_cashback_paise, referral_cashback_paise) INTO v_product_cashback 
            FROM public.shopping_products WHERE id = p_product_id;
        END IF;

        IF v_product_cashback IS NOT NULL AND v_product_cashback > 0 THEN
            v_cashback_paise := v_product_cashback;
        ELSE
            SELECT COALESCE((value->>'product_promo_default_cashback_paise')::BIGINT, (value->>'referral_order_default_cashback_paise')::BIGINT, 10000) INTO v_cashback_paise
            FROM public.marketing_settings WHERE key = 'rewards_config';
            v_cashback_paise := COALESCE(v_cashback_paise, 10000);
        END IF;
        v_desc := 'Product Promotion Cashback on customer purchase';

        UPDATE public.marketing_share_links 
        SET orders_count = orders_count + 1 
        WHERE id = v_link.id;
    END IF;

    -- Credit referrer wallet only if positive cashback
    IF v_cashback_paise <= 0 THEN
        RETURN jsonb_build_object('success', true, 'reward_paise', 0);
    END IF;

    SELECT role INTO v_referrer_role FROM public.user_profiles WHERE id = v_link.user_id;

    IF v_referrer_role = 'merchant' AND v_link.merchant_id IS NOT NULL THEN
        UPDATE public.merchants 
        SET wallet_balance_paise = wallet_balance_paise + v_cashback_paise 
        WHERE id = v_link.merchant_id
        RETURNING wallet_balance_paise INTO v_new_balance;

        INSERT INTO public.merchant_transactions (
            merchant_id, transaction_type, amount_paise, balance_after_paise, description, metadata
        ) VALUES (
            v_link.merchant_id, 'marketing_cashback', v_cashback_paise, v_new_balance, v_desc,
            jsonb_build_object('link_id', v_link.id, 'event_type', p_event_type)
        );
    ELSE
        INSERT INTO public.customer_wallets (user_id, balance_paise)
        VALUES (v_link.user_id, 0)
        ON CONFLICT (user_id) DO NOTHING;

        SELECT id, balance_paise INTO v_cust_wallet_id, v_cust_bal_before
        FROM public.customer_wallets 
        WHERE user_id = v_link.user_id;

        v_new_balance := v_cust_bal_before + v_cashback_paise;

        UPDATE public.customer_wallets 
        SET balance_paise = v_new_balance, updated_at = now()
        WHERE id = v_cust_wallet_id;

        INSERT INTO public.customer_wallet_transactions (
            wallet_id, user_id, type, amount_paise, balance_before_paise, balance_after_paise, description, reference_id, reference_type
        ) VALUES (
            v_cust_wallet_id, v_link.user_id, 'CREDIT', v_cashback_paise, v_cust_bal_before, v_new_balance,
            v_desc, v_link.id::text, 'MARKETING_CAMPAIGN'
        );
    END IF;

    -- Log tracking event
    INSERT INTO public.marketing_tracking_events (
        link_id, event_type, converted_user_id, metadata
    ) VALUES (
        v_link.id, p_event_type, p_converted_user_id, jsonb_build_object('cashback_paise', v_cashback_paise)
    );

    -- Send notification
    INSERT INTO public.notifications (
        user_id, title, body, type, reference_id, reference_type
    ) VALUES (
        v_link.user_id,
        'Marketing Cashback Earned! 🚀',
        'You earned ₹' || (v_cashback_paise / 100)::text || ' promotion cashback.',
        'success',
        v_link.id,
        'campaign_reward'
    );

    RETURN jsonb_build_object('success', true, 'cashback_paise', v_cashback_paise, 'new_balance_paise', v_new_balance);
END;
$$;

-- Marketing Conversion Function Alias
CREATE OR REPLACE FUNCTION public.process_marketing_conversion_reward(
    p_event_type TEXT,
    p_ref_code TEXT,
    p_converted_user_id UUID,
    p_product_id UUID DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN public.process_marketing_referral_reward(p_event_type, p_ref_code, p_converted_user_id, p_product_id);
END;
$$;

-- 4. RPC: rotate_daily_challenge_sponsorships (Midnight Rotation)
CREATE OR REPLACE FUNCTION public.rotate_daily_challenge_sponsorships()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE public.daily_challenge_sponsorships
    SET status = 'completed'
    WHERE sponsor_date < CURRENT_DATE AND status = 'live';

    UPDATE public.daily_challenge_sponsorships
    SET status = 'live'
    WHERE sponsor_date = CURRENT_DATE AND status = 'booked';
END;
$$;

-- 5. RPC: get_marketing_dashboard_stats (Aggregator for User/Merchant)
CREATE OR REPLACE FUNCTION public.get_marketing_dashboard_stats(p_user_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_total_shares INTEGER := 0;
    v_link_clicks INTEGER := 0;
    v_new_customers INTEGER := 0;
    v_orders INTEGER := 0;
    v_cashback_earned BIGINT := 0;
    v_user_role TEXT;
    v_merchant_id UUID;
    v_live_sponsor JSONB := NULL;
    v_today_play JSONB := NULL;
    v_rewards_config JSONB;
BEGIN
    -- Read dynamic settings
    SELECT value INTO v_rewards_config FROM public.marketing_settings WHERE key = 'rewards_config';

    -- Check link metrics
    SELECT 
        COALESCE(SUM(shares_count), 0),
        COALESCE(SUM(clicks_count), 0),
        COALESCE(SUM(registrations_count), 0),
        COALESCE(SUM(orders_count), 0)
    INTO v_total_shares, v_link_clicks, v_new_customers, v_orders
    FROM public.marketing_share_links
    WHERE user_id = p_user_id;

    -- Check user role & calculate marketing cashback earned
    SELECT role INTO v_user_role FROM public.user_profiles WHERE id = p_user_id;

    IF v_user_role = 'merchant' THEN
        SELECT id INTO v_merchant_id FROM public.merchants WHERE user_id = p_user_id;
        IF v_merchant_id IS NOT NULL THEN
            SELECT COALESCE(SUM(amount_paise), 0) INTO v_cashback_earned
            FROM public.merchant_transactions
            WHERE merchant_id = v_merchant_id 
              AND transaction_type IN ('daily_challenge_cashback', 'marketing_cashback', 'sponsorship');
        END IF;
    ELSE
        SELECT COALESCE(SUM(amount_paise), 0) INTO v_cashback_earned
        FROM public.customer_wallet_transactions
        WHERE user_id = p_user_id 
          AND type = 'CREDIT' 
          AND (reference_type IN ('DAILY_CHALLENGE', 'MARKETING_REFERRAL') OR description ILIKE '%Challenge%' OR description ILIKE '%Referral%');
    END IF;

    -- Get today's live sponsor if any
    SELECT jsonb_build_object(
        'merchant_name', m.business_name,
        'campaign_message', s.campaign_message,
        'product_ids', s.product_ids
    ) INTO v_live_sponsor
    FROM public.daily_challenge_sponsorships s
    JOIN public.merchants m ON m.id = s.merchant_id
    WHERE s.sponsor_date = CURRENT_DATE AND s.status = 'live'
    LIMIT 1;

    -- Check if user completed today's play
    SELECT jsonb_build_object(
        'completed', true,
        'score', score,
        'cashback_awarded_paise', cashback_awarded_paise
    ) INTO v_today_play
    FROM public.daily_challenge_plays
    WHERE user_id = p_user_id AND challenge_date = CURRENT_DATE;

    RETURN jsonb_build_object(
        'total_shares', v_total_shares,
        'link_clicks', v_link_clicks,
        'new_customers', v_new_customers,
        'orders', v_orders,
        'cashback_earned_paise', v_cashback_earned,
        'today_sponsor', v_live_sponsor,
        'today_play', v_today_play,
        'rewards_config', v_rewards_config
    );
END;
$$;
