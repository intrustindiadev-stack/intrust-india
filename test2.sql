
BEGIN;
SET LOCAL role = authenticated;
SET LOCAL request.jwt.claims = $${"sub": "7d5569cb-512d-4ee0-86dd-aa5230304733", "role": "authenticated"}$$;
SELECT public.add_to_shopping_cart(
    '7d5569cb-512d-4ee0-86dd-aa5230304733', 
    NULL, 
    'b0bcad76-11b3-4954-8b8e-0cb386cf5336', 
    1, 
    true
);
ROLLBACK;

