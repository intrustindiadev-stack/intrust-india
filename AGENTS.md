# Intrust India — AI Agent Memory: VPS & Database Access

> **Share this file** with your AI coding assistant (Cursor, Claude, Copilot, Antigravity, etc.)
> as a rule/system prompt so it always knows how to reach the production database and VPS.

---

## 🏗️ Architecture Overview

This project uses a **self-hosted Supabase stack** running inside Docker on a private VPS.

| Component | Detail |
|---|---|
| VPS IP | `187.124.98.130` |
| VPS User | `intrustindia` |
| VPS Password | `intrustind@2026` |
| SSH Port | `22` |
| PostgreSQL | Runs **inside Docker** — port NOT exposed to internet |
| Docker Container | `supabase-db` |
| Next.js App | Managed by `pm2` as `intrust-india` |
| Project Dir (VPS) | `/home/intrustindia/intrust-india/` |

### ⚠️ Critical Constraint: Database is NOT directly reachable

The PostgreSQL database is firewalled. You **cannot** connect with:
- `psql postgresql://...`
- `supabase db push`
- Any direct TCP connection

The **only** way to reach the database is via **SSH through paramiko Python scripts**.

---

## 📁 Scripts Directory

All helper scripts live in `scripts/` (relative to the project root). Always check here before
writing a new script.

| Script | Purpose |
|---|---|
| `scripts/vps_config.py` | **Central config** — VPS credentials + shared helpers (`get_ssh_client`, `exec_sql`, `exec_vps_cmd`). Import from here, never hardcode credentials. |
| `scripts/apply_migration.py` | Apply a **single** `.sql` migration file to the VPS DB |
| `scripts/apply_recent_migrations.py` | Auto-detect and apply **all** unapplied local migrations |
| `scripts/query_db.py` | Run an arbitrary SQL query and print results |
| `scripts/run_vps_cmd.py` | Run an arbitrary shell command on the VPS via SSH |
| `scripts/validate_schema.py` | Validate all DB functions/views using `plpgsql_check` |

---

## 🤖 Rules for AI Agents

### Rule 1: Always use SSH scripts for DB access

Never attempt direct DB connections. Always use the scripts above or the helpers in `vps_config.py`.

```python
# ✅ CORRECT — use exec_sql from vps_config
from scripts.vps_config import exec_sql
out, err = exec_sql("SELECT count(*) FROM public.leads;")

# ❌ WRONG — will fail, port is firewalled
import psycopg2
conn = psycopg2.connect("postgresql://postgres:...@187.124.98.130:5432/postgres")
```

### Rule 2: Check `scripts/` before writing a new script

Before writing any new debug, query, or migration script, `ls scripts/` and `ls scripts/dev/`
to see if one already exists.

### Rule 3: Applying migrations — exact SOP

When you create a new `.sql` file in `supabase/migrations/`:

```bash
# Apply a specific migration:
python scripts/apply_migration.py supabase/migrations/20260904_my_change.sql

# Or apply all unapplied local migrations:
python scripts/apply_recent_migrations.py
```

The script will: SSH → upload .sql to VPS /tmp → exec via docker → clean up.

### Rule 4: Post-migration validation is MANDATORY

After applying any migration that modifies a function, RLS policy, trigger, or schema,
you MUST run all of these before declaring the work done:

```bash
# 1. Schema validation
python scripts/validate_schema.py

# 2. Execute the affected RPC / query manually
echo "SELECT your_rpc_function(...);" | python scripts/query_db.py

# 3. Trigger test (if triggers involved) — update a row that fires the trigger
echo "UPDATE public.your_table SET updated_at = now() WHERE id = '...';" | python scripts/query_db.py

# 4. Production build
npm run build
```

**A migration being applied ≠ the migration being correct.** Do not finalize until all tests pass.

### Rule 5: Restarting the Next.js App

```bash
python scripts/run_vps_cmd.py -c "source ~/.nvm/nvm.sh && pm2 restart intrust-india"

# Check status:
python scripts/run_vps_cmd.py -c "source ~/.nvm/nvm.sh && pm2 status"

# View logs:
python scripts/run_vps_cmd.py -c "source ~/.nvm/nvm.sh && pm2 logs intrust-india --lines 50"
```

### Rule 6: Quick DB queries

```bash
# Count leads
echo "SELECT count(*) FROM public.leads;" | python scripts/query_db.py

# Check a user
echo "SELECT id, phone, email FROM auth.users WHERE phone = '+919999999999';" | python scripts/query_db.py

# Check RLS policies
echo "SELECT tablename, policyname, cmd, qual FROM pg_policies WHERE schemaname='public';" | python scripts/query_db.py
```

---

## 🔑 Credentials Reference

```
VPS_HOST     = "187.124.98.130"
VPS_USER     = "intrustindia"
VPS_PASSWORD = "intrustind@2026"
VPS_PORT     = 22

SUPABASE_CONTAINER = "supabase-db"
PG_ADMIN_ROLE      = "supabase_admin"   # use for migrations
PG_ROLE            = "postgres"          # use for queries
```

All of the above are already set in `scripts/vps_config.py`. Import from there.

---

## 🧰 Setup: Dependencies

Install on each team member's machine:

```bash
pip install paramiko
```

No other external dependencies are required for the scripts.

---

## ✅ Checklist: Before Declaring a DB Change Done

- [ ] Migration applied (`apply_migration.py` or `apply_recent_migrations.py`)
- [ ] Schema validation passed (`validate_schema.py` exits 0)
- [ ] RPC/function tested manually (`query_db.py`)
- [ ] Trigger tested (if applicable)
- [ ] Authorization/RLS tested (correct users can/cannot access)
- [ ] Production build passes (`npm run build`)
