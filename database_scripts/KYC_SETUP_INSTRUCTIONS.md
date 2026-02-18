# KYC System Setup Instructions

## Overview

This guide walks you through setting up the KYC (Know Your Customer) verification system in your Supabase database.

## Prerequisites

- Supabase project created and configured
- Environment variables set in `.env.local`:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (for admin operations)
- Admin access to Supabase Dashboard

---

## Step 1: Run Database Migration

1. Open your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy the contents of `kyc_schema_migration.sql`
5. Paste and execute the query
6. Verify success: You should see "Success. No rows returned"

**What this does:**
- Adds new columns: `phone_number`, `pan_number`, `full_address`, `bank_grade_security`
- Creates `verification_status` enum (pending, verified, rejected)
- Adds admin tracking: `verified_by`, `verified_at`
- Creates indexes for performance
- Adds data validation constraints (PAN format, phone format)

---

## Step 2: Enable Row Level Security (RLS)

1. In Supabase SQL Editor, create another new query
2. Copy the contents of `kyc_rls_policies.sql`
3. Paste and execute the query
4. Verify success: Check that policies are created

**What this does:**
- Enables RLS on `kyc_records` table
- Users can view/edit only their own pending KYC records
- Admins can view/edit all KYC records
- Prevents data leakage between users

---

## Step 3: Verify Schema

Run this query in SQL Editor to check the table structure:

```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'kyc_records'
ORDER BY ordinal_position;
```

**Expected columns:**
- `id` (uuid)
- `user_id` (uuid)
- `phone_number` (text)
- `pan_number` (text)
- `full_address` (text)
- `bank_grade_security` (boolean)
- `verification_status` (verification_status_enum)
- `verified_by` (uuid)
- `verified_at` (timestamp with time zone)
- `created_at` (timestamp with time zone)
- `updated_at` (timestamp with time zone)
- Plus existing columns from original schema

---

## Step 4: Verify RLS Policies

Run this query to check that RLS is enabled and policies are active:

```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'kyc_records';

-- List all policies
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'kyc_records';
```

**Expected policies:**
- Users can view own KYC
- Users can create own KYC
- Users can update own pending KYC
- Admins can view all KYC
- Admins can update any KYC

---

## Step 5: Create Admin User (Optional)

To test admin functionality, you need at least one admin user in the `app_admins` table.

**Option A: Make yourself an admin**
```sql
-- Get your user ID first (run while logged in)
SELECT auth.uid();

-- Then insert into app_admins
INSERT INTO app_admins (user_id) 
VALUES ('YOUR_USER_ID_HERE');
```

**Option B: Make current logged-in user admin**
```sql
INSERT INTO app_admins (user_id) 
SELECT auth.uid() 
WHERE NOT EXISTS (
  SELECT 1 FROM app_admins WHERE user_id = auth.uid()
);
```

---

## Step 6: Test Basic Functionality

### Test 1: Regular User Can Submit KYC

1. Login to your app as a regular user
2. Navigate to `/merchant-apply` or `/profile/kyc`
3. Fill out the KYC form
4. Submit
5. Check Supabase: `SELECT * FROM kyc_records WHERE user_id = 'YOUR_USER_ID';`
6. Verify: `verification_status` should be 'pending'

### Test 2: User Cannot See Other Users' KYC

1. Login as User A, submit KYC
2. Note the record's ID
3. Logout and login as User B
4. Try to query User A's KYC record via API
5. Expected: Access denied (RLS policy blocks it)

### Test 3: Admin Can View All KYC Records

1. Make yourself an admin (Step 5)
2. Query all KYC records via admin panel or API
3. Expected: Can see all users' KYC records

---

## Troubleshooting

### Issue: Migration fails with "column already exists"

**Solution:** Some columns may already exist. The migration uses `IF NOT EXISTS` to prevent errors. You can safely ignore these warnings.

### Issue: RLS blocks all access

**Solution:** 
1. Check you're authenticated: `SELECT auth.uid();` should return your user ID
2. Verify policies are created: Run verification query from Step 4
3. For admin access, ensure you're in `app_admins` table

### Issue: Cannot insert KYC record

**Solution:**
1. Check `user_id` matches authenticated user: `auth.uid() = user_id`
2. Verify you're passing the correct user ID in the INSERT statement
3. Check browser console for detailed error messages

### Issue: PAN/Phone validation fails

**Solution:**
- PAN must match format: `ABCDE1234F` (5 uppercase letters + 4 digits + 1 uppercase letter)
- Phone must be exactly 10 digits, no spaces or special characters: `9876543210`

---

## Security Best Practices

✅ **DO:**
- Always use Server Actions or API routes for KYC submissions
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client
- Validate all inputs on both client and server
- Use RLS policies (already configured)
- Log all KYC status changes for audit trails

❌ **DON'T:**
- Allow direct client-side database writes
- Store sensitive data unencrypted (PAN, phone)
- Allow users to change `verification_status` directly
- Disable RLS on `kyc_records` table

---

## Next Steps

After completing this setup:

1. ✅ Database is ready
2. ✅ RLS policies are active
3. ⏭️ Deploy the Next.js application with KYC components
4. ⏭️ Test end-to-end flow: submit KYC → verify in database
5. ⏭️ Build admin panel for KYC approval (future work)

---

## Admin Panel Requirements (Future)

To build an admin KYC approval panel, you'll need:

- `/admin/kyc` page to list all pending KYC requests
- `/admin/kyc/[id]` page to view and approve/reject individual requests
- Update query to set `verification_status`, `verified_by`, `verified_at`
- Email/SMS notifications on approval/rejection

**Example approval query:**
```sql
UPDATE kyc_records
SET 
  verification_status = 'verified',
  verified_by = auth.uid(),
  verified_at = NOW()
WHERE id = 'KYC_RECORD_ID';
```

---

## Support

If you encounter any issues:
1. Check Supabase logs in Dashboard → Logs
2. Check browser console for client-side errors
3. Verify environment variables are set correctly
4. Review RLS policies match expected behavior
