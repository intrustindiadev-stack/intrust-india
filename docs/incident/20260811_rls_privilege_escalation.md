# Incident Report: RLS Privilege Escalation & Data Manipulation
**Date:** August 11, 2026
**Status:** Mitigated (Immediate fixes applied; further review required)

## What Happened
A malicious actor discovered our application and began creating multiple fake accounts (`lixtanpro@gmail.com`, `g.flymc@gmail.com`, `jeannettoyer@gmail.com`, etc.). 

Shortly after signing up, the attacker successfully escalated their privileges by assigning themselves the `admin` role. With admin access—and by exploiting additional vulnerabilities—they were able to:
1. Arbitrarily print money into their own wallets (via `customer_wallets`).
2. Modify global reward configurations (changing the signup reward to 100,000 points).
3. Place massive fake orders (e.g., Samsung TVs) using their inflated wallet balances, completely draining our platform inventory.

## Root Cause Analysis
The root cause was a fundamental misunderstanding of how **Row Level Security (RLS)** works in PostgreSQL and Supabase.

In Supabase, RLS policies evaluate permissions at the **row** level, not the **column** level.
When we define a policy like:
```sql
CREATE POLICY "Users can update own profile" 
ON user_profiles FOR UPDATE 
USING ( id = auth.uid() );
```
This policy tells the database: *"If the user owns this row, let them update it."*
However, it does **not** restrict *which columns* they can update. By default, they can update **every column in that row**. 

### The Attack Vector
1. The attacker inspected our frontend network traffic or source code to extract the `NEXT_PUBLIC_SUPABASE_URL` and the public anonymous API key.
2. They created a standard user account via Supabase Auth.
3. They bypassed our frontend UI and sent direct REST API requests to our database using tools like cURL or Postman.
4. Because they "owned" their `user_profiles` row, they ran an API update like: `UPDATE user_profiles SET role = 'admin' WHERE id = 'their-uid'`. The database accepted this because the RLS policy only checked row ownership.
5. They repeated this attack on `customer_wallets`, bypassing the checkout system entirely to set `wallet_balance_paise = 999999999`.

## What Was Fixed Today
1. **Data Cleanup:** 
   - All malicious accounts, fake orders, and CRM leads were permanently wiped.
   - Hacked reward configurations were restored.
   - Platform and merchant inventory for the 17 stolen products was restored.
2. **Critical Vulnerabilities Patched:**
   - Dropped the vulnerable UPDATE policy on `customer_wallets`.
   - Created a database trigger (`user_profiles_sensitive_column_guard`) on `user_profiles` that intercepts updates and enforces column-level security. It silently blocks regular users from updating sensitive fields like `role`, `kyc_status`, and `reward_points_earned`.
   - Dropped excessively permissive UPDATE policies on `transactions` and `reward_transactions`.
3. **Signup Blocker:**
   - Added a `BEFORE INSERT` trigger on `auth.users` to automatically hard-reject any future signup attempts using the hacker's known email addresses.

---

## Action Items for Tomorrow (Checklist)

> [!WARNING]
> While the critical bleeding has stopped, during the investigation, we found over **25 other RLS policies** that use `UPDATE (user_id = auth.uid())`. Many of these tables likely contain sensitive columns that need protection.

- [ ] **Audit Remaining RLS Policies:** Query all UPDATE policies and inspect their corresponding tables. 
  - Tables to double-check: `kyc_submissions`, `crm_leads`, `career_applications`, `contact_messages`, `admin_tasks`, etc.
- [ ] **Implement Column Guards:** For any table where a user legitimately needs to update a row (e.g., updating their KYC document upload) but *should not* update administrative columns (e.g., `is_verified` or `approval_status`), we must add `BEFORE UPDATE` trigger guards similar to the one we put on `user_profiles`.
- [ ] **Review Frontend SDK Usage:** Ensure the frontend application isn't relying on direct `supabase.from('table').update()` calls for sensitive actions. State changes (like transaction success/failure) must always be routed through secure backend API routes (`app/api/`) or secure RPC functions.
- [ ] **Knowledge Base Update:** Document best practices for Supabase RLS (specifically column-level protection via triggers) so future developers do not repeat this mistake.
