import sys
from deploy_vps import ssh_connect, run_remote

# Note the extra 'intrustindia' user field before the command
CRONS_TEMPLATE = """
# Evening greeting - 20:00 IST (14:30 UTC)
30 14 * * * intrustindia curl -s -X GET https://intrustindia.com/api/cron/evening-greeting -H "Authorization: Bearer {cron_secret}" >> /var/log/intrust-cron.log 2>&1

# Win-back campaign - Weekly on Mondays at 10:00 IST (04:30 UTC)
30 4 * * 1 intrustindia curl -s -X GET https://intrustindia.com/api/cron/winback -H "Authorization: Bearer {cron_secret}" >> /var/log/intrust-cron.log 2>&1

# KYC reminders - Daily at 11:00 IST (05:30 UTC)
30 5 * * * intrustindia curl -s -X GET https://intrustindia.com/api/cron/kyc-reminders -H "Authorization: Bearer {cron_secret}" >> /var/log/intrust-cron.log 2>&1

# Merchant Subscription Expiry - Daily at 11:30 IST (06:00 UTC)
0 6 * * * intrustindia curl -s -X GET https://intrustindia.com/api/cron/subscription-expiry -H "Authorization: Bearer {cron_secret}" >> /var/log/intrust-cron.log 2>&1

# Merchant Investment Maturity - Daily at 12:00 IST (06:30 UTC)
30 6 * * * intrustindia curl -s -X GET https://intrustindia.com/api/cron/investment-maturity -H "Authorization: Bearer {cron_secret}" >> /var/log/intrust-cron.log 2>&1
"""

def main():
    print("Connecting to VPS to update system crond...")
    client = ssh_connect()
    try:
        print("Fetching CRON_SECRET from .env.local...")
        env_content = run_remote(client, "cat /var/www/intrustindia.com/app/.env.local", exit_on_fail=False)
        cron_secret = "YOUR_CRON_SECRET_HERE"
        for line in env_content.splitlines():
            if line.startswith("CRON_SECRET="):
                cron_secret = line.split("=", 1)[1].strip()
                break
        
        crons_to_add = CRONS_TEMPLATE.format(cron_secret=cron_secret)
        
        import tempfile
        sftp = client.open_sftp()
        with tempfile.NamedTemporaryFile(mode="w", delete=False) as tmp:
            tmp.write(crons_to_add)
            tmp.flush()
            sftp.put(tmp.name, "/tmp/intrustindia_cron")
        sftp.close()
        
        # Use sudo to copy the file to /etc/cron.d/ and fix permissions
        run_remote(client, "echo 'Intrustdev@2026' | sudo -S cp /tmp/intrustindia_cron /etc/cron.d/intrustindia_jobs")
        run_remote(client, "echo 'Intrustdev@2026' | sudo -S chmod 644 /etc/cron.d/intrustindia_jobs")
        run_remote(client, "echo 'Intrustdev@2026' | sudo -S chown root:root /etc/cron.d/intrustindia_jobs")
        run_remote(client, "rm /tmp/intrustindia_cron")
        
        print("Successfully created /etc/cron.d/intrustindia_jobs")
        print("Contents:")
        print(run_remote(client, "cat /etc/cron.d/intrustindia_jobs"))
    finally:
        client.close()

if __name__ == "__main__":
    main()
