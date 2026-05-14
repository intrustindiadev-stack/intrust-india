# Module 12: System & Audit

Infrastructure logging, platform-level configurations, and security audit trails.

## Tables

### audit_logs
General platform-level audit logs for tracking actions.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | uuid_generate_v4() | - |
| actor_id | uuid | YES | - | Reference to user_profiles |
| actor_role | USER-DEFINED | YES | - | user_role |
| action | USER-DEFINED | NO | - | action_type |
| entity_type | text | NO | - | - |
| entity_id | uuid | YES | - | - |
| description | text | NO | - | - |
| metadata | jsonb | YES | - | - |
| ip_address | inet | YES | - | - |
| created_at | timestamp with time zone | NO | now() | - |

---

### kyc_audit_logs
Specific audit trail for KYC status changes and SprintVerify results.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | - |
| kyc_record_id | uuid | NO | - | Reference to kyc_records |
| user_id | uuid | NO | - | Reference to user_profiles |
| action | text | NO | - | - |
| old_status | text | YES | - | - |
| new_status | text | YES | - | - |
| api_response | jsonb | YES | - | - |
| created_at | timestamp with time zone | YES | now() | - |

---

### platform_settings
Dynamic platform configuration key-value store.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | - |
| key | text | NO | - | Unique configuration key |
| value | text | NO | - | Configuration value |
| description | text | YES | - | - |
| updated_at | timestamp with time zone | NO | timezone('utc'::text, now()) | - |

---

### platform_banners
Management of promotional banners displayed on the platform.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | - |
| title | text | NO | - | - |
| image_url | text | NO | - | - |
| target_url | text | YES | - | - |
| is_active | boolean | YES | true | - |
| audience | text | NO | 'customer' | - |
| sort_order | integer | YES | 0 | - |
| created_at | timestamp with time zone | NO | now() | - |

---

### otp_codes
Temporary storage for mobile OTP verification codes.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | - |
| phone | text | NO | - | - |
| otp_hash | text | NO | - | - |
| expires_at | timestamp with time zone | NO | - | - |
| attempts | integer | YES | 0 | - |
| max_attempts | integer | YES | 5 | - |
| is_used | boolean | YES | false | - |
| created_at | timestamp with time zone | YES | now() | - |

---

### migrations
Database migration records for schema version tracking.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | integer | NO | - | - |
| name | varchar | NO | - | - |
| executed_at | timestamp | YES | now() | - |
| hash | varchar | NO | - | - |
