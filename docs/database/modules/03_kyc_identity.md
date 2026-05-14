# Module 3: KYC & Identity

This module manages the Know Your Customer (KYC) verification process for users and merchants.

## Tables

### 1. [kyc_records](file:///c:/Users/2003a/Desktop/Projects/intrust-india/intrust-india-main/docs/database/modules/03_kyc_identity.md#kyc_records)
The primary table for user identity verification records.

| Column | Type | Nullable | Default | Description |
| --- | --- | --- | --- | --- |
| `id` | uuid | NO | uuid_generate_v4() | - |
| `user_id` | uuid | NO | - | - |
| `status` | kyc_status | NO | 'pending' | Domain-specific ENUM: pending, verified, rejected. |
| `full_legal_name` | text | NO | - | - |
| `pan_number` | text | YES | - | Verified via SprintVerify. |
| `verification_status` | verification_status_enum | YES | 'pending' | Detailed status. |
| `sprint_verify_data` | jsonb | YES | - | Raw API response from SprintVerify. |

**RLS Policies:**
- `Admins can view all KYC`: (SELECT) Restricted to rows where `is_admin()` is true.
- `Users can view/create own KYC`: (SELECT, INSERT) Restricted to own `user_id`.

---

### 2. [kyc_audit_logs](file:///c:/Users/2003a/Desktop/Projects/intrust-india/intrust-india-main/docs/database/modules/03_kyc_identity.md#kyc_audit_logs)
Tracks all changes to KYC records for compliance and auditing.

| Column | Type | Nullable | Default | Description |
| --- | --- | --- | --- | --- |
| `id` | uuid | NO | gen_random_uuid() | - |
| `kyc_record_id` | uuid | NO | - | - |
| `action` | text | NO | - | e.g., 'APPROVAL', 'REJECTION'. |
| `old_status` | text | YES | - | - |
| `new_status` | text | YES | - | - |

**RLS Policies:**
- `Admins can view all`: (SELECT) Full access for administrators.
- `Users can view own logs`: (SELECT) Restricted to logs where `user_id` matches.

---

### 3. [sprintverify_api_monitoring](file:///c:/Users/2003a/Desktop/Projects/intrust-india/intrust-india-main/docs/database/modules/03_kyc_identity.md#sprintverify_api_monitoring)
Success and failure rates for the SprintVerify identity API.

| Column | Type | Nullable | Default | Description |
| --- | --- | --- | --- | --- |
| `hour` | timestamp with time zone | YES | - | - |
| `total_api_calls` | bigint | YES | - | - |
| `successful_calls` | bigint | YES | - | - |
| `failed_calls` | bigint | YES | - | - |
