# Module 13: Storage

Management of file storage buckets and objects, primarily for KYC documents, product images, and merchant documents.

## Tables (storage schema)

### buckets
Storage containers for grouping files.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | text | NO | - | Unique ID (slug) |
| name | text | NO | - | Human-readable name |
| public | boolean | YES | - | If true, objects are public |
| file_size_limit | bigint | YES | - | Limit in bytes |
| allowed_mime_types | text[] | YES | - | - |
| created_at | timestamp with time zone | YES | - | - |

---

### objects
Individual files stored within buckets.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | - | Unique file ID |
| bucket_id | text | YES | - | Reference to buckets |
| name | text | YES | - | File name / path |
| owner | uuid | YES | - | Reference to user_profiles |
| metadata | jsonb | YES | - | - |
| version | text | YES | - | - |
| last_accessed_at | timestamp with time zone | YES | - | - |
| created_at | timestamp with time zone | YES | - | - |
