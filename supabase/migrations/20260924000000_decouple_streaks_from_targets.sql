-- Migration: Decouple Streaks from Targets & Populate Production Marketing Targets
-- Description:
--   1. Removes legacy quiz_streak targets from marketing_targets
--   2. Ensures targets are purely action and marketing-based (shares, link clicks, sales/orders)
--   3. Seeds production targets with verified gift prizes and cashbacks

DELETE FROM public.marketing_targets;

INSERT INTO public.marketing_targets (
    id, title, description, target_audience, metric_type, target_value, reward_type, reward_value_paise, gift_name, gift_image_url, sort_order, is_active
) VALUES 
(
    'a1111111-1111-4111-8111-111111111111',
    'Starter Deal Ambassador',
    'Share 5 verified platform deals with friends, family, or social groups',
    'all',
    'share_links',
    5,
    'cashback',
    10000,
    NULL,
    NULL,
    1,
    true
),
(
    'a2222222-2222-4222-8222-222222222222',
    'Traffic Booster Influencer',
    'Generate 25 link visits to any InTrust product deals from your shared links',
    'all',
    'link_clicks',
    25,
    'cashback',
    25000,
    NULL,
    NULL,
    2,
    true
),
(
    'a3333333-3333-4333-8333-333333333333',
    'Audio Tech Champion',
    'Share 20 verified platform products to unlock premium ANC wireless earbuds with free doorstep delivery',
    'all',
    'share_links',
    20,
    'physical_gift',
    0,
    'Active Noise-Cancelling (ANC) Wireless Earbuds',
    '/marketing/prizes/anc_earbuds.jpg',
    3,
    true
),
(
    'a4444444-4444-4444-8444-444444444444',
    'Smart Lifestyle Master',
    'Achieve 5 verified customer store orders through your shared links to receive a luxury smartwatch',
    'all',
    'store_sales',
    5,
    'physical_gift',
    0,
    'Titanium Sapphire Chrono Smartwatch',
    '/marketing/prizes/smartwatch.jpg',
    4,
    true
),
(
    'a5555555-5555-4555-8555-555555555555',
    'Merchant Executive Scale Pack',
    'Achieve 25 store sales on the platform to unlock the official InTrust executive merchant hamper',
    'merchant',
    'store_sales',
    25,
    'physical_gift',
    0,
    'Executive Leather Hamper & Tech Suite',
    '/marketing/prizes/executive_kit.jpg',
    5,
    true
),
(
    'a6666666-6666-4666-8666-666666666666',
    '24K Pure Minted Gold Coin',
    'Achieve 50 verified product sales to earn a certified 24K pure minted gold keepsake trophy',
    'all',
    'store_sales',
    50,
    'physical_gift',
    0,
    '24K Pure 999.9 Gold Minted Coin',
    '/marketing/prizes/gold_coin.jpg',
    6,
    true
)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    target_audience = EXCLUDED.target_audience,
    metric_type = EXCLUDED.metric_type,
    target_value = EXCLUDED.target_value,
    reward_type = EXCLUDED.reward_type,
    reward_value_paise = EXCLUDED.reward_value_paise,
    gift_name = EXCLUDED.gift_name,
    gift_image_url = EXCLUDED.gift_image_url,
    sort_order = EXCLUDED.sort_order,
    is_active = EXCLUDED.is_active;
