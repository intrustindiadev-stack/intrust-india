# Module 1: Auth & Admin

This module handles administrative permissions, tasks assigned to administrators, and authentication-related tokens.

## Tables

### 1. [admin_permissions](file:///c:/Users/2003a/Desktop/Projects/intrust-india/intrust-india-main/docs/database/modules/01_auth_admin.md#admin_permissions)
Stores specific permissions assigned to administrative users.

| Column | Type | Nullable | Default | Description |
| --- | --- | --- | --- | --- |
| `id` | uuid | NO | gen_random_uuid() | Unique identifier for the permission record. |
| `admin_user_id` | uuid | NO | - | ID of the administrator user in `user_profiles`. |
| `permission` | text | NO | - | Specific permission string (e.g., 'manage_merchants'). |
| `created_at` | timestamp with time zone | NO | now() | - |

**RLS Policies:**
- `Admins can view all permissions`: (SELECT) Only admins can view permissions.
- `Service role can manage permissions`: (ALL) Service role has full access.

---

### 2. [admin_tasks](file:///c:/Users/2003a/Desktop/Projects/intrust-india/intrust-india-main/docs/database/modules/01_auth_admin.md#admin_tasks)
Tracks tasks assigned to administrators for operational activities.

| Column | Type | Nullable | Default | Description |
| --- | --- | --- | --- | --- |
| `id` | uuid | NO | gen_random_uuid() | - |
| `title` | text | NO | - | - |
| `description` | text | YES | - | - |
| `assigned_to` | uuid | NO | - | - |
| `assigned_by` | uuid | NO | - | - |
| `priority` | text | NO | 'medium'::text | - |
| `status` | text | NO | 'pending'::text | - |
| `due_date` | timestamp with time zone | YES | - | - |
| `created_at` | timestamp with time zone | YES | now() | - |
| `updated_at` | timestamp with time zone | YES | now() | - |

**RLS Policies:**
- `admins_select_own_tasks`: (SELECT) Admins can only see tasks assigned to them.
- `admins_update_own_task_status`: (UPDATE) Admins can only update status of their own tasks.

---

### 3. [auth_tokens](file:///c:/Users/2003a/Desktop/Projects/intrust-india/intrust-india-main/docs/database/modules/01_auth_admin.md#auth_tokens)
Stores temporary authentication or verification tokens.

| Column | Type | Nullable | Default | Description |
| --- | --- | --- | --- | --- |
| `id` | uuid | NO | gen_random_uuid() | - |
| `user_id` | uuid | NO | - | - |
| `email` | text | NO | - | - |
| `token_type` | text | NO | - | - |
| `sent_at` | timestamp with time zone | NO | now() | - |
| `expires_at` | timestamp with time zone | NO | - | - |
| `used_at` | timestamp with time zone | YES | - | - |
| `ip_address` | text | YES | - | - |
| `created_at` | timestamp with time zone | NO | now() | - |

**RLS Policies:**
- `auth_tokens_service_only`: (ALL) Denies all access except to service role (`qual: false`, `with_check: false`).
