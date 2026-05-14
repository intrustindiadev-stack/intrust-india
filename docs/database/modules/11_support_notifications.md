# Module 11: Support & Notifications

Communication and notification preferences for users and merchants.

## Tables

### notifications
Platform-wide notifications for users.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Unique notification ID |
| user_id | uuid | NO | - | Reference to user_profiles |
| title | text | NO | - | Notification title |
| body | text | NO | - | Notification content |
| type | text | NO | 'info' | e.g., 'info', 'success', 'warning' |
| read | boolean | NO | false | Read status |
| reference_id | uuid | YES | - | Linked entity ID |
| reference_type | text | YES | - | Linked entity type |
| created_at | timestamp with time zone | NO | now() | - |

**RLS Policies:**
- `users_view_own_notifications`: User can view where `auth.uid() = user_id`.
- `users_update_own_notifications`: User can update where `auth.uid() = user_id`.
- `users_insert_own_notifications`: User can insert where `auth.uid() = user_id`.

---

### merchant_notification_settings
Granular notification preferences for merchants.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| merchant_id | uuid | NO | - | Reference to merchants |
| email_notifications | boolean | NO | true | - |
| purchase_notifications | boolean | NO | true | - |
| sale_notifications | boolean | NO | true | - |
| marketing_updates | boolean | NO | false | - |
| updated_at | timestamp with time zone | YES | now() | - |
