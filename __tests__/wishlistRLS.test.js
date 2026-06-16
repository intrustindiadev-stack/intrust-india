import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const CUSTOMER_EMAIL = process.env.TEST_CUSTOMER_EMAIL;
const CUSTOMER_PASS  = process.env.TEST_CUSTOMER_PASSWORD;

// Seeded user ID from the database backup (known to have wishlist items)
const SEEDED_USER_B_ID = 'f1a54ece-db21-4afb-bd7f-182e32d9e51f';

describe('CUST-06: Wishlist rows scoped to authenticated user only (RLS)', () => {

    describe('1. Static Schema and Migration Verification', () => {
        it('should verify that Row-Level Security is enabled on the user_wishlists table in schema definition', () => {
            const backupPath = path.resolve(__dirname, '../supabase_backup_2026-06-05.sql');
            expect(fs.existsSync(backupPath)).toBe(true);

            const sqlContent = fs.readFileSync(backupPath, 'utf8');

            // 1. Verify RLS is enabled for user_wishlists
            const rlsRegex = /ALTER TABLE( ONLY)? public\.user_wishlists ENABLE ROW LEVEL SECURITY/i;
            expect(rlsRegex.test(sqlContent)).toBe(true);

            // 2. Verify wishlist_owner_all policy exists
            const policyRegex = /CREATE POLICY wishlist_owner_all ON public\.user_wishlists\s+USING\s*\(\(auth\.uid\(\) = user_id\)\)\s+WITH CHECK\s*\(\(auth\.uid\(\) = user_id\)\)/i;
            expect(policyRegex.test(sqlContent)).toBe(true);
        });

        it('should verify migrations contain RLS policy declarations for user_wishlists', () => {
            const migrationsDir = path.resolve(__dirname, '../supabase/migrations');
            expect(fs.existsSync(migrationsDir)).toBe(true);

            const migrationFiles = fs.readdirSync(migrationsDir);
            let foundRLSEnabled = false;
            let foundWishlistPolicy = false;

            migrationFiles.forEach(file => {
                const filePath = path.join(migrationsDir, file);
                if (fs.statSync(filePath).isFile()) {
                    const content = fs.readFileSync(filePath, 'utf8');
                    
                    if (content.includes('ALTER TABLE public.user_wishlists ENABLE ROW LEVEL SECURITY') ||
                        content.includes('ALTER TABLE IF EXISTS public.user_wishlists ENABLE ROW LEVEL SECURITY')) {
                        foundRLSEnabled = true;
                    }
                    if (content.includes('CREATE POLICY wishlist_owner_all ON public.user_wishlists') || 
                        content.includes('CREATE POLICY wishlist_owner_all ON user_wishlists') ||
                        content.includes('CREATE POLICY "wishlist_owner_all" ON public.user_wishlists') ||
                        content.includes('CREATE POLICY "wishlist_owner_all" ON user_wishlists')) {
                        foundWishlistPolicy = true;
                    }
                }
            });

            expect(foundRLSEnabled).toBe(true);
            expect(foundWishlistPolicy).toBe(true);
        });
    });

    describe('2. Live Database RLS Verification (Read-Only)', () => {
        it('should verify that RLS restricts query results to the authenticated user only', async () => {
            if (!SUPABASE_URL || !ANON_KEY || !CUSTOMER_EMAIL || !CUSTOMER_PASS) {
                console.log('Skipping live DB check: Supabase credentials or test emails are not defined in the environment.');
                return;
            }

            // 1. Initialize customer client (enforces RLS)
            const customerSupabase = createClient(SUPABASE_URL, ANON_KEY, {
                auth: { persistSession: false }
            });

            // 2. Login as test customer (User A)
            let { data: authData, error: loginErr } = await customerSupabase.auth.signInWithPassword({
                email: CUSTOMER_EMAIL,
                password: CUSTOMER_PASS
            });
            if (loginErr && (loginErr.message.includes('Invalid login credentials') || loginErr.status === 400)) {
                const { data: signUpData, error: signUpErr } = await customerSupabase.auth.signUp({
                    email: CUSTOMER_EMAIL,
                    password: CUSTOMER_PASS,
                    options: {
                        data: {
                            full_name: 'Tester A'
                        }
                    }
                });
                if (!signUpErr && signUpData?.user) {
                    const adminClient = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
                    await adminClient.auth.admin.updateUserById(signUpData.user.id, { email_confirm: true });
                    const retry = await customerSupabase.auth.signInWithPassword({
                        email: CUSTOMER_EMAIL,
                        password: CUSTOMER_PASS
                    });
                    authData = retry.data;
                    loginErr = retry.error;
                }
            }
            expect(loginErr).toBeNull();
            expect(authData.user).toBeDefined();

            const userAId = authData.user.id;

            // 3. Attempt to read User B's wishlist items as authenticated User A
            // User B is known to have 3 items in the SQL backup copy command:
            // - 09fe4e57-269d-432e-8215-a5c1e0e8af1d
            // - 10bbc6ea-e60f-4961-86fc-ee0d7795d555
            // - 32c7d365-e97e-46c9-a947-4958bd7df747
            const { data: userBItems, error: userBError } = await customerSupabase
                .from('user_wishlists')
                .select('*')
                .eq('user_id', SEEDED_USER_B_ID);

            expect(userBError).toBeNull();
            
            // Assert: User A cannot see User B's items (returns 0 rows due to RLS)
            expect(userBItems).toHaveLength(0);

            // 4. Query all wishlist rows as User A
            const { data: userAItems, error: userAError } = await customerSupabase
                .from('user_wishlists')
                .select('*');

            expect(userAError).toBeNull();

            // Assert: Every single returned row belongs to User A
            userAItems.forEach(item => {
                expect(item.user_id).toBe(userAId);
            });

            console.log(`RLS validated successfully: User A (${userAId}) queried ${userAItems.length} own wishlist items and was prevented from reading User B's (${SEEDED_USER_B_ID}) items.`);
        });
    });
});
