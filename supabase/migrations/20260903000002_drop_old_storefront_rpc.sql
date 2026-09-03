-- Drop the old 6-parameter overload of get_storefront_page that no longer 
-- has sub_category support. Leaving both caused PostgREST ambiguity and 
-- resulted in the old version being called, ignoring sub_category/price/brand/size/color filters.
DROP FUNCTION IF EXISTS public.get_storefront_page(text, integer, integer, text, text, uuid);
