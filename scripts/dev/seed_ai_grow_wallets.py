import paramiko
import sys

VPS_HOST = "187.124.98.130"
VPS_USER = "intrustindia"
VPS_PASSWORD = "Intrustdev@2026"
VPS_PORT = 22

def main():
    print("Connecting to VPS...")
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(VPS_HOST, port=VPS_PORT, username=VPS_USER, password=VPS_PASSWORD, timeout=30)

    # 1. Wipe current dummy wallets
    print("Wiping existing dummy wallets...")
    cmd1 = "docker exec -i supabase-db psql -U supabase_admin -d postgres -c \"TRUNCATE TABLE ai_grow_wallet_transactions CASCADE; TRUNCATE TABLE ai_grow_wallets CASCADE;\""
    c.exec_command(cmd1)

    # 2. Get a valid admin UUID to use as the actor
    print("Fetching an admin user...")
    cmd_admin = "docker exec -i supabase-db psql -U supabase_admin -d postgres -t -A -c \"SELECT id FROM user_profiles WHERE role IN ('admin', 'super_admin') LIMIT 1;\""
    stdin, stdout, stderr = c.exec_command(cmd_admin)
    admin_id = stdout.read().decode().strip()
    if not admin_id:
        print("No admin user found to attribute the audit logs to!")
        sys.exit(1)

    # 3. Migrate actual data from merchant_investments
    print("Migrating actual production data to wallets...")
    migration_sql = f"""
    DO $$ 
    DECLARE
        r RECORD;
        v_wallet_id UUID;
        v_total NUMERIC;
    BEGIN
        -- Find all merchants with active investments and sum their capital deployed
        FOR r IN 
            SELECT merchant_id, SUM(amount_paise) / 100.0 AS total_balance
            FROM merchant_investments
            WHERE status = 'active'
            GROUP BY merchant_id
            HAVING SUM(amount_paise) > 0
        LOOP
            -- Create the wallet with the calculated actual balance
            INSERT INTO ai_grow_wallets (merchant_id, balance, currency, status)
            VALUES (r.merchant_id, r.total_balance, 'INR', 'active')
            RETURNING id INTO v_wallet_id;
            
            -- Insert the initial migration audit record
            INSERT INTO ai_grow_wallet_transactions (
                wallet_id, merchant_id, admin_id, transaction_type, 
                amount, previous_balance, new_balance, reason
            ) VALUES (
                v_wallet_id, r.merchant_id, '{admin_id}'::uuid, 'credit',
                r.total_balance, 0, r.total_balance, 'Initial balance migration from active capital deployed'
            );
        END LOOP;
    END $$;
    """

    cmd3 = f"echo \"{migration_sql.replace('$', '\\$')}\" | docker exec -i supabase-db psql -U supabase_admin -d postgres"
    stdin, stdout, stderr = c.exec_command(cmd3)
    err = stderr.read().decode()
    if err and "ERROR" in err:
        print("Migration failed:", err)
    else:
        print("Migration successful! Actual balances have been seeded.")

    c.close()

if __name__ == "__main__":
    main()
