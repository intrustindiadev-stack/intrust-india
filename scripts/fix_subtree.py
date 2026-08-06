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
CREATE OR REPLACE FUNCTION public.team_get_user_subtree(p_user_id uuid)
  RETURNS TABLE(team_id uuid)
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public', 'pg_temp'
 AS $function$
 DECLARE
     v_role TEXT;
     v_user_team_id UUID;
 BEGIN
     SELECT user_profiles.role::text, user_profiles.team_id INTO v_role, v_user_team_id
     FROM public.user_profiles WHERE user_profiles.id = p_user_id;

     IF v_role IN ('admin', 'super_admin') THEN
         RETURN QUERY SELECT t.id FROM public.teams t WHERE t.is_active = true;
     ELSIF v_role = 'relationship_manager' THEN
         RETURN QUERY 
         WITH RECURSIVE manager_teams AS (
             -- Base case: teams led by user OR team user belongs to
             SELECT id FROM public.teams 
             WHERE is_active = true AND (team_lead_id = p_user_id OR id = v_user_team_id)
             UNION
             -- Recursive case: active children of manager teams
             SELECT child.id FROM public.teams child
             INNER JOIN manager_teams parent ON child.parent_team_id = parent.id
             WHERE child.is_active = true
         )
         SELECT DISTINCT id FROM manager_teams;
     ELSIF v_role = 'relationship_exec' THEN
         IF v_user_team_id IS NOT NULL THEN
             RETURN QUERY SELECT t.id FROM public.teams t WHERE t.id = v_user_team_id AND t.is_active = true;
         END IF;
     END IF;
     RETURN;
 END;
 $function$;
"""
sftp.putfo(io.BytesIO(sql.encode()), "/tmp/fix_subtree.sql")
_, stdout, stderr = c.exec_command("docker exec -i supabase-db psql -U supabase_admin -d postgres -c \"$(cat /tmp/fix_subtree.sql)\"")
print("STDOUT:", stdout.read().decode().strip())
print("STDERR:", stderr.read().decode().strip())
