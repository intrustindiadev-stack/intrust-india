# Rollback and Restore Runbook

This document details the procedures for rolling back the Self-Hosted Supabase migration or restoring from automated backups.

## 1. Rolling Back to Cloud Supabase

If the VPS deployment has critical issues, you can quickly revert traffic back to Supabase Cloud.

### Reverting DNS
1. Log in to your Cloudflare dashboard.
2. Select the `intrustindia.com` domain.
3. Delete or modify the `A` record for `supabase.intrustindia.com` to point back to the original Supabase Cloud `CNAME`.
4. Make sure proxying (Orange Cloud) is enabled if it was previously.

### Reverting Next.js App
1. On the Vercel dashboard or your hosting provider, change the environment variables back to point to the `bhgbylyzlwmmabegxlfc.supabase.co` URL.
2. Trigger a re-deployment to apply the changes immediately.

## 2. Restoring from Automated Backups

Our `automated_backup.sh` runs daily and places Postgres dumps and Storage tarballs in `/var/www/intrustindia.com/backups`.

> [!IMPORTANT]
> The backups are encrypted using `AES-256`. You MUST know the `BACKUP_ENCRYPTION_PASSPHRASE` from `/etc/intrust/ops.conf`.

### Restoring Postgres

1. **Decrypt the backup**:
   ```bash
   openssl enc -d -aes-256-cbc -pbkdf2 -iter 100000 -in db_YYYY-MM-DD.sql.gz.enc -out db_restore.sql.gz -pass "pass:YOUR_PASSPHRASE"
   ```
2. **Decompress**:
   ```bash
   gunzip db_restore.sql.gz
   ```
3. **Restore to Docker Container**:
   ```bash
   cat db_restore.sql | docker exec -i supabase-db psql -U postgres -d postgres
   ```

### Restoring Storage

1. **Decrypt the backup**:
   ```bash
   openssl enc -d -aes-256-cbc -pbkdf2 -iter 100000 -in storage_YYYY-MM-DD.tar.gz.enc -out storage_restore.tar.gz -pass "pass:YOUR_PASSPHRASE"
   ```
2. **Extract to Volume Directory**:
   ```bash
   cd /var/www/intrustindia.com/supabase-stack/volumes
   sudo tar -xzf /path/to/storage_restore.tar.gz
   ```
3. **Restart Storage Service**:
   ```bash
   cd /var/www/intrustindia.com/supabase-stack
   docker compose restart storage
   ```

## 3. Post-Restore Verification

After a restore, verify the following:
- Run `node scripts/check-migration-drift.js` to ensure the schema matches.
- Log in to the application and ensure user sessions are active.
- Verify images on `/shop` are loading correctly.
- Test a dummy purchase or wallet RPC call.
