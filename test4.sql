
BEGIN;
SET LOCAL role = authenticated;
SET LOCAL request.jwt.claims = $$ {"sub": "d29ca56d-1c56-4477-8dca-c8f47604f377", "role": "authenticated"} $$;
SELECT public.add_to_shopping_cart(
    'd29ca56d-1c56-4477-8dca-c8f47604f377', 
    NULL, 
    'b0bcad76-11b3-4954-8b8e-0cb386cf5336', 
    1, 
    true
);
ROLLBACK;

