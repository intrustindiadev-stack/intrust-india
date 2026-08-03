CREATE OR REPLACE FUNCTION public.trg_route_solar_to_crm()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    INSERT INTO public.crm_leads (
        title, 
        contact_name, 
        phone, 
        email, 
        source, 
        status, 
        notes, 
        pipeline_stage,
        created_by
    ) VALUES (
        'Solar Request: ' || NEW.name,
        NEW.name,
        NEW.mobile,
        NEW.email,
        'solar',
        'new',
        'City: ' || COALESCE(NEW.city, 'N/A') || ' | Bill: ' || COALESCE(NEW.monthly_bill_range, 'N/A'),
        'new',
        NEW.user_id
    );
    RETURN NEW;
END;
$function$;
