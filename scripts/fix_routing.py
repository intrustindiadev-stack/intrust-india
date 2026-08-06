import paramiko
import io

VPS_HOST = "187.124.98.130"
VPS_USER = "intrustindia"
VPS_PASSWORD = "Intrustdev@2026"
VPS_PORT = 22

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(VPS_HOST, port=VPS_PORT, username=VPS_USER, password=VPS_PASSWORD, timeout=30)
sftp = c.open_sftp()

sql = """
CREATE OR REPLACE FUNCTION public.crm_route_lead_territory()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
    v_match RECORD;
    v_rep_id UUID;
    v_actor UUID := auth.uid();
BEGIN
    IF (TG_OP = 'UPDATE' AND NEW.routing_status IN ('manual_override', 'reroute_pending')) THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' AND NEW.routing_status = 'auto_matched' THEN
        IF NOT (
            NEW.pincode IS DISTINCT FROM OLD.pincode OR
            NEW.zone IS DISTINCT FROM OLD.zone OR
            NEW.area IS DISTINCT FROM OLD.area OR
            NEW.city IS DISTINCT FROM OLD.city OR
            NEW.state IS DISTINCT FROM OLD.state
        ) THEN
            RETURN NEW; 
        END IF;
    END IF;

    v_match := public.crm_match_team_for_location(NEW.pincode, NEW.zone, NEW.area, NEW.city, NEW.state);

    IF v_match IS NOT NULL AND v_match.out_team_id IS NOT NULL THEN
        NEW.assigned_team_id     := v_match.out_team_id;
        NEW.territory_match_type := v_match.out_match_type;
        NEW.routing_status       := 'auto_matched';
        NEW.routed_at            := now();

        IF (TG_OP = 'INSERT' OR NEW.assigned_to IS NULL) THEN
            v_rep_id := public.crm_pick_team_rep(v_match.out_team_id);
            IF v_rep_id IS NOT NULL THEN
                NEW.assigned_to := v_rep_id;
            END IF;
        END IF;
    ELSE
        NEW.assigned_team_id     := NULL;
        NEW.territory_match_type := NULL;
        NEW.routing_status       := 'unmatched';
        NEW.routed_at            := NULL;
        NEW.assigned_to          := NULL;
    END IF;

    RETURN NEW;
END;
$$;
"""

sftp.putfo(io.BytesIO(sql.encode()), "/tmp/fix_routing.sql")
_, stdout, stderr = c.exec_command("docker exec -i supabase-db psql -U supabase_admin -d postgres < /tmp/fix_routing.sql")
print("STDOUT:", stdout.read().decode())
print("STDERR:", stderr.read().decode())
