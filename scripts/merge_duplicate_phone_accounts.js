/**
 * scripts/merge_duplicate_phone_accounts.js
 *
 * Safe de-duplication and merging of duplicate phone accounts.
 *
 * Usage:
 *   Dry run:  node scripts/merge_duplicate_phone_accounts.js
 *   Commit:   node scripts/merge_duplicate_phone_accounts.js --commit
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Environment Loader
// ---------------------------------------------------------------------------
function loadEnv() {
    try {
        const envPath = path.resolve(process.cwd(), '.env.local');
        const envFile = fs.readFileSync(envPath, 'utf8');
        const envVars = {};
        envFile.split('\n').forEach(line => {
            const [key, ...valueParts] = line.split('=');
            if (key && valueParts.length > 0) {
                let value = valueParts.join('=');
                value = value.replace(/\r/g, '').trim();
                if (value.startsWith('"') && value.endsWith('"')) {
                    value = value.slice(1, -1);
                }
                envVars[key.trim()] = value;
            }
        });
        return envVars;
    } catch (e) {
        console.error('Could not read .env.local:', e.message);
        return {};
    }
}

const env = loadEnv();
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

// Helper: normalize to 10 digits
function getPhone10(phone, email) {
    if (phone) {
        const digits = phone.replace(/\D/g, '');
        if (digits.length >= 10) {
            return digits.slice(-10);
        }
    }
    if (email) {
        const match = email.match(/^p([0-9]{10})@phone\.intrust\.internal$/);
        if (match) {
            return match[1];
        }
    }
    return null;
}

// Helper: format to canonical +91XXXXXXXXXX
function canonicalPhone(digits10) {
    return `+91${digits10}`;
}

async function main() {
    const isCommit = process.argv.includes('--commit');
    console.log(`=== Phone Accounts De-duplication & Merge ===`);
    console.log(`Supabase URL: ${supabaseUrl}`);
    console.log(`Mode: ${isCommit ? 'COMMIT/MUTATION' : 'DRY RUN (no changes)'}\n`);

    // 1. Fetch auth.users
    const { data: { users: authUsers }, error: authErr } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (authErr) {
        console.error('Failed to fetch auth.users:', authErr.message);
        process.exit(1);
    }

    // 2. Fetch public.user_profiles
    const { data: profiles, error: profErr } = await supabase
        .from('user_profiles')
        .select('*');
    if (profErr) {
        console.error('Failed to fetch user_profiles:', profErr.message);
        process.exit(1);
    }

    const profilesMap = {};
    profiles.forEach(p => {
        profilesMap[p.id] = p;
    });

    // 3. Group users by normalized 10-digit phone number
    const groups = {};
    authUsers.forEach(u => {
        const up = profilesMap[u.id] || {};
        const p10 = getPhone10(u.phone || up.phone, u.email);
        if (p10) {
            groups[p10] = groups[p10] || [];
            groups[p10].push({
                id: u.id,
                created_at: new Date(u.created_at),
                phone: u.phone,
                email: u.email,
                profile_phone: up.phone || '',
                profile_name: up.full_name || ''
            });
        }
    });

    const duplicateGroups = Object.keys(groups).filter(k => groups[k].length > 1);

    if (duplicateGroups.length === 0) {
        console.log('No duplicate phone account groups found. Everything is clean!');
        process.exit(0);
    }

    console.log(`Found ${duplicateGroups.length} duplicate phone group(s) to process:\n`);

    for (const phone10 of duplicateGroups) {
        const group = groups[phone10];
        console.log(`----------------------------------------------------------------------`);
        console.log(`Group Phone (last 10): ${phone10} (${group.length} accounts found)`);

        // Check ownership of data to decide who is canonical
        const candidates = [];
        for (const u of group) {
            // Get count of key data owned by this account
            const { count: merchantCount } = await supabase
                .from('merchants')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', u.id);

            const { count: txCount } = await supabase
                .from('transactions')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', u.id);

            const { count: orderCount } = await supabase
                .from('orders')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', u.id);

            const { count: walletTxCount } = await supabase
                .from('wallet_transactions')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', u.id);

            const score = (merchantCount || 0) * 100 + (txCount || 0) * 5 + (orderCount || 0) * 5 + (walletTxCount || 0);
            candidates.push({
                ...u,
                score,
                merchantCount: merchantCount || 0,
                txCount: txCount || 0,
                orderCount: orderCount || 0,
                walletTxCount: walletTxCount || 0
            });
        }

        // Sort candidates: highest score first, then oldest created_at first
        candidates.sort((a, b) => {
            if (b.score !== a.score) {
                return b.score - a.score;
            }
            return a.created_at - b.created_at;
        });

        const canonical = candidates[0];
        const duplicates = candidates.slice(1);

        console.log(`Canonical candidate (score=${canonical.score}, created=${canonical.created_at.toISOString()}):`);
        console.log(`  ID: ${canonical.id}`);
        console.log(`  Auth Email: '${canonical.email}', Phone: '${canonical.phone}'`);
        console.log(`  Profile Name: '${canonical.profile_name}', Phone: '${canonical.profile_phone}'`);
        console.log(`  Ownership: merchants=${canonical.merchantCount}, txs=${canonical.txCount}, orders=${canonical.orderCount}, wallet_txs=${canonical.walletTxCount}`);

        console.log(`Duplicates to merge & delete:`);
        duplicates.forEach(d => {
            console.log(`  - ID: ${d.id} (score=${d.score}, created=${d.created_at.toISOString()})`);
            console.log(`    Auth Email: '${d.email}', Phone: '${d.phone}'`);
            console.log(`    Profile Name: '${d.profile_name}', Phone: '${d.profile_phone}'`);
            console.log(`    Ownership: merchants=${d.merchantCount}, txs=${d.txCount}, orders=${d.orderCount}, wallet_txs=${d.walletTxCount}`);
        });

        if (isCommit) {
            console.log(`[EXECUTION] Merging duplicate data into canonical account...`);
            const targetPhone = canonicalPhone(phone10);

            for (const d of duplicates) {
                // Step A: Run public.merge_duplicate_user_data RPC
                const { error: rpcErr } = await supabase.rpc('merge_duplicate_user_data', {
                    p_duplicate_id: d.id,
                    p_original_id: canonical.id
                });
                
                if (rpcErr) {
                    console.error(`  [ERROR] RPC merge failed for duplicate ${d.id}:`, rpcErr.message);
                    process.exit(1);
                }
                console.log(`  [OK] Database data repointed/merged for duplicate ${d.id}`);

                // Step B: Delete auth.users record via GoTrue Admin API
                const { error: deleteErr } = await supabase.auth.admin.deleteUser(d.id);
                if (deleteErr) {
                    console.error(`  [ERROR] GoTrue delete failed for duplicate ${d.id}:`, deleteErr.message);
                    process.exit(1);
                }
                console.log(`  [OK] Deleted auth.users record for duplicate ${d.id}`);
            }

            // Step C: Normalize canonical phone in auth.users
            const { error: authUpdateErr } = await supabase.auth.admin.updateUserById(canonical.id, {
                phone: targetPhone,
                phone_confirm: true
            });
            if (authUpdateErr) {
                console.error(`  [ERROR] Failed to update auth.users phone to '${targetPhone}':`, authUpdateErr.message);
                process.exit(1);
            }
            console.log(`  [OK] Normalized auth.users phone to '${targetPhone}' for canonical account`);

            // Step D: Normalize user_profiles phone
            // Set phone to targetPhone, and ensure email is not null if original has email
            const profileUpdates = {
                phone: targetPhone,
                updated_at: new Date().toISOString()
            };
            if (canonical.email && !canonical.profile_email) {
                profileUpdates.email = canonical.email;
            }

            const { error: profUpdateErr } = await supabase
                .from('user_profiles')
                .update(profileUpdates)
                .eq('id', canonical.id);

            if (profUpdateErr) {
                console.error(`  [ERROR] Failed to update user_profiles phone/email:`, profUpdateErr.message);
                process.exit(1);
            }
            console.log(`  [OK] Normalized user_profiles phone/email for canonical account`);
        }
    }

    console.log(`----------------------------------------------------------------------`);
    if (!isCommit) {
        console.log(`\nDry run completed successfully. No databases were modified.`);
        console.log(`To apply these changes permanently, run:`);
        console.log(`  node scripts/merge_duplicate_phone_accounts.js --commit`);
    } else {
        console.log(`\nAll duplicate groups successfully merged and accounts de-duplicated!`);
    }
}

main().catch(err => {
    console.error('Fatal unhandled error:', err);
    process.exit(1);
});
