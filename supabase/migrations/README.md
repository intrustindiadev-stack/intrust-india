# Migrations

This folder is the single source of truth for the database schema.

**Naming Convention:**
All migrations must be named using the format: `<YYYYMMDDHHMMSS>_<verb>_<noun>.sql`

**Rules:**
- Do NOT use `_v2`, `_v3`, `_final`, or `_fix_` suffixes.
- Each migration should represent a forward-only change.
- Never edit an applied migration. Create a new one instead.
