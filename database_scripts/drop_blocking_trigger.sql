-- The trigger 'ensure_kyc_approved_before_merchant' prevents merchant creation 
-- if KYC is not approved. This conflicts with the new flow where we allow 
-- application submission BEFORE KYC is fully approved (we check status at the end).

DROP TRIGGER IF EXISTS "ensure_kyc_approved_before_merchant" ON public.merchants;
DROP FUNCTION IF EXISTS public.check_kyc_before_merchant();
