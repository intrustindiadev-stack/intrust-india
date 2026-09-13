# Intrust India — Agent Kit

This package contains the **VPS/Database helper scripts** and the **AI agent memory prompt**
for the Intrust India project.

## Contents

```
intrust-agent-kit/
├── AGENTS.md               ← AI agent memory prompt (add to your AI assistant)
├── README.md               ← This file
└── scripts/
    ├── vps_config.py       ← Central VPS config & shared SSH helpers
    ├── apply_migration.py  ← Apply a single .sql migration
    ├── apply_recent_migrations.py  ← Auto-apply all unapplied migrations
    ├── query_db.py         ← Run SQL queries against the VPS DB
    ├── run_vps_cmd.py      ← Run shell commands on the VPS
    └── validate_schema.py  ← Validate DB schema with plpgsql_check
```

## Quickstart

### 1. Install dependencies

```bash
pip install paramiko
```

### 2. Drop scripts into your project

Copy the `scripts/` folder into the root of your `intrust-india` project.

### 3. Add the agent memory to your AI assistant

- **Antigravity / AGY**: Copy `AGENTS.md` to `.agent/AGENTS.md` in your project root
- **Cursor**: Add contents of `AGENTS.md` to `.cursorrules`
- **Claude Projects**: Add `AGENTS.md` as a project document
- **GitHub Copilot**: Add `AGENTS.md` to `.github/copilot-instructions.md`

### 4. Use the scripts

```bash
# Apply a migration
python scripts/apply_migration.py supabase/migrations/20260904_my_change.sql

# Apply all pending migrations
python scripts/apply_recent_migrations.py

# Query the DB
echo "SELECT count(*) FROM public.leads;" | python scripts/query_db.py

# Run shell command on VPS
python scripts/run_vps_cmd.py -c "pm2 list"

# Validate schema after migration
python scripts/validate_schema.py
```

## ⚠️ Security Note

These scripts contain production VPS credentials. **Do not commit this package to a public repo.**
Distribute only to authorized team members over a secure channel.
