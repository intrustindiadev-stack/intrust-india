-- Dry run: merchants with placeholder payer contact values that SabPaisa will reject.
select
    id,
    user_id,
    business_name,
    business_email,
    business_phone,
    regexp_replace(coalesce(business_phone, ''), '\D', '', 'g') as normalized_business_phone
from public.merchants
where
    lower(coalesce(business_email, '')) in ('merchant@example.com', 'example.com', 'test@test.com')
    or regexp_replace(regexp_replace(coalesce(business_phone, ''), '\D', '', 'g'), '^91', '') in (
        '9999999999',
        '0000000000',
        '1111111111',
        '2222222222',
        '3333333333',
        '4444444444',
        '5555555555',
        '6666666666',
        '7777777777',
        '8888888888'
    );

-- Execute only during an approved operations window.
-- update public.merchants
-- set
--     business_phone = case
--         when regexp_replace(regexp_replace(coalesce(business_phone, ''), '\D', '', 'g'), '^91', '') in (
--             '9999999999',
--             '0000000000',
--             '1111111111',
--             '2222222222',
--             '3333333333',
--             '4444444444',
--             '5555555555',
--             '6666666666',
--             '7777777777',
--             '8888888888'
--         ) then null
--         else business_phone
--     end,
--     business_email = case
--         when lower(coalesce(business_email, '')) in ('merchant@example.com', 'example.com', 'test@test.com') then null
--         else business_email
--     end,
--     updated_at = now()
-- where
--     lower(coalesce(business_email, '')) in ('merchant@example.com', 'example.com', 'test@test.com')
--     or regexp_replace(regexp_replace(coalesce(business_phone, ''), '\D', '', 'g'), '^91', '') in (
--         '9999999999',
--         '0000000000',
--         '1111111111',
--         '2222222222',
--         '3333333333',
--         '4444444444',
--         '5555555555',
--         '6666666666',
--         '7777777777',
--         '8888888888'
--     );
