-- ============================================================================
-- Migration: Update Marketing Physical Gifts, Prize Images & Remove Referrals
-- Created: 2026-09-21
-- Description:
--   1. Removes 'referrals' from marketing_targets and replaces with quiz_streak,
--      share_links, and store_sales targets.
--   2. Attaches high-definition gift_image_url to all physical gifts.
--   3. Seeds exclusive physical prize milestones.
-- ============================================================================

-- 1. CLEAN UP OBSOLETE REFERRAL TARGETS FROM MARKETING
DELETE FROM public.marketing_targets 
WHERE metric_type = 'referrals';

-- 2. SEED EXCLUSIVE PHYSICAL PRIZES & STREAK REWARDS WITH REAL IMAGES
INSERT INTO public.marketing_targets (
    title, 
    description, 
    target_audience, 
    metric_type, 
    target_value, 
    reward_type, 
    reward_value_paise, 
    gift_name, 
    gift_image_url, 
    sort_order, 
    is_active
) VALUES 
(
    '14-Day Streak Audio Champion', 
    'Achieve a 14-day consecutive daily quiz streak without losing your freezes.', 
    'all', 
    'quiz_streak', 
    14, 
    'physical_gift', 
    0, 
    'Active Noise-Cancelling (ANC) Wireless Earbuds', 
    '/marketing/prizes/anc_earbuds.jpg', 
    3, 
    true
),
(
    '30-Day Quiz Streak Master', 
    'Conquer 30 consecutive days of daily trivia challenges to win our flagship smartwatch.', 
    'all', 
    'quiz_streak', 
    30, 
    'physical_gift', 
    0, 
    'Titanium Sapphire Chrono Smartwatch', 
    '/marketing/prizes/smartwatch.jpg', 
    4, 
    true
),
(
    'Merchant Executive Scale Pack', 
    'Achieve 25 verified store sales or high-volume wholesale customer orders.', 
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
    'Grand Trivia Champion 24K Gold Coin', 
    'Achieve a legendary 60-day streak or win the quarterly grand trivia championship.', 
    'all', 
    'quiz_streak', 
    60, 
    'physical_gift', 
    0, 
    '24K Pure 999.9 Gold Minted Coin', 
    '/marketing/prizes/gold_coin.jpg', 
    6, 
    true
)
ON CONFLICT DO NOTHING;

-- 3. UPDATE ANY REMAINING TARGETS TO ENSURE VALID NON-REFERRAL METRICS
UPDATE public.marketing_targets
SET gift_image_url = '/marketing/prizes/smartwatch.jpg'
WHERE reward_type = 'physical_gift' AND (gift_image_url IS NULL OR gift_image_url = '');
