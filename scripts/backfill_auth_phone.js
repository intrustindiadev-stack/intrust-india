/**
 * backfill_auth_phone.js
 *
 * GoTrue-mediated operations that cannot be done via direct SQL on auth.users:
 *
 *   Operation A — Upgrade legacy phone-<uuid>@intrust.internal pseudo-emails to
 *                 stable p<phone>@phone.intrust.internal format so future magic-link
 *                 session minting works reliably.
 *
 *   Operation B — Backfill auth.users.phone for Google/email-first users who linked
 *                 a phone via the WhatsApp link-phone route (phone is in user_profiles
 *                 but NULL in auth.users).
 *
 * Fully idempotent — re-running is safe because both operations check current state
 * before mutating.
 *
 * Usage:  npm run backfill:auth-phone
 * Requires .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Env loader (mirrors fix_name.js — no dotenv dependency needed)
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

// ---------------------------------------------------------------------------
// Phone helpers
// ---------------------------------------------------------------------------

/** Strip all non-digit characters from a string. */
function stripNonDigits(str) {
    return (str || '').replace(/\D/g, '');
}

/**
 * Derive the stable pseudo-email from a phone number.
 * Uses the last 10 digits of the phone (matching the DB normalize_in_phone logic).
 * Returns null if the phone has fewer than 10 digits.
 */
function stablePseudoEmail(phone) {
    const digits = stripNonDigits(phone);
    if (digits.length < 10) return null;
    const last10 = digits.slice(-10);
    return `p${last10}@phone.intrust.internal`;
}

/**
 * Derive canonical +91XXXXXXXXXX phone from any stored phone value.
 * Returns null if fewer than 10 digits.
 */
function canonicalPhone(phone) {
    const digits = stripNonDigits(phone);
    if (digits.length < 10) return null;
    return `+91${digits.slice(-10)}`;
}

/** Returns true if the email looks like an old UUID pseudo-email. */
function isLegacyPseudoEmail(email) {
    return /^phone-[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}@intrust\.internal$/.test(email || '');
}

// ---------------------------------------------------------------------------
// Operation A — Upgrade legacy UUID pseudo-emails
// ---------------------------------------------------------------------------
async function upgradeUuidPseudoEmails() {
    console.log('\n=== Operation A: Upgrade legacy UUID pseudo-emails ===');

    // Fetch all users (paginate if workspace ever grows beyond 1000)
    const { data: { users }, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (error) {
        console.error('[UPGRADE-EMAIL-FATAL] Could not list users:', error.message);
        return { upgraded: 0, skipped: 0, errored: 0 };
    }

    const targets = users.filter(u => isLegacyPseudoEmail(u.email));
    console.log(`Found ${targets.length} user(s) with legacy UUID pseudo-emails.`);

    let upgraded = 0, skipped = 0, errored = 0;

    for (const user of targets) {
        const phone = user.phone;

        if (!phone) {
            console.warn(`[UPGRADE-EMAIL-SKIP] ${user.id} — phone is null/empty, cannot derive stable email`);
            skipped++;
            continue;
        }

        const newEmail = stablePseudoEmail(phone);
        if (!newEmail) {
            console.warn(`[UPGRADE-EMAIL-SKIP] ${user.id} — phone "${phone}" has <10 digits, skipping`);
            skipped++;
            continue;
        }

        // Idempotency guard: only update if still on legacy email
        if (!isLegacyPseudoEmail(user.email)) {
            console.log(`[UPGRADE-EMAIL-SKIP] ${user.id} — email "${user.email}" is already stable`);
            skipped++;
            continue;
        }

        const { error: updateErr } = await supabase.auth.admin.updateUserById(user.id, {
            email: newEmail,
            email_confirm: true,
        });

        if (updateErr) {
            console.error(`[UPGRADE-EMAIL-ERROR] ${user.id} → "${newEmail}": ${updateErr.message}`);
            errored++;
        } else {
            console.log(`[UPGRADE-EMAIL] ${user.id} → "${newEmail}"`);
            upgraded++;
        }
    }

    console.log(`Operation A complete — upgraded: ${upgraded}, skipped: ${skipped}, errored: ${errored}`);
    return { upgraded, skipped, errored };
}

// ---------------------------------------------------------------------------
// Operation B — Backfill auth.users.phone for Google/email-first users
// ---------------------------------------------------------------------------
async function backfillAuthPhone() {
    console.log('\n=== Operation B: Backfill auth.users.phone for profile-linked phones ===');

    // Fetch all user_profiles that have a phone set
    const { data: profiles, error: profileErr } = await supabase
        .from('user_profiles')
        .select('id, phone')
        .not('phone', 'is', null);

    if (profileErr) {
        console.error('[BACKFILL-PHONE-FATAL] Could not fetch user_profiles:', profileErr.message);
        return { updated: 0, skipped: 0, errored: 0 };
    }

    console.log(`Found ${profiles.length} profile(s) with a phone set.`);

    let updated = 0, skipped = 0, errored = 0;

    for (const profile of profiles) {
        // Get live auth.users row
        const { data: { user: authUser }, error: getUserErr } = await supabase.auth.admin.getUserById(profile.id);

        if (getUserErr || !authUser) {
            console.error(`[BACKFILL-PHONE-ERROR] ${profile.id} — could not fetch auth user: ${getUserErr?.message}`);
            errored++;
            continue;
        }

        // Idempotency guard: skip if auth.users.phone is already set
        if (authUser.phone) {
            console.log(`[BACKFILL-PHONE-SKIP] ${profile.id} — auth.users.phone already set: "${authUser.phone}"`);
            skipped++;
            continue;
        }

        const canonical = canonicalPhone(profile.phone);
        if (!canonical) {
            console.warn(`[BACKFILL-PHONE-SKIP] ${profile.id} — profile phone "${profile.phone}" has <10 digits, skipping`);
            skipped++;
            continue;
        }

        const { error: updateErr } = await supabase.auth.admin.updateUserById(profile.id, {
            phone: canonical,
            phone_confirm: true,
        });

        if (updateErr) {
            console.error(`[BACKFILL-PHONE-ERROR] ${profile.id} → "${canonical}": ${updateErr.message}`);
            errored++;
        } else {
            console.log(`[BACKFILL-PHONE] ${profile.id} → "${canonical}"`);
            updated++;
        }
    }

    console.log(`Operation B complete — updated: ${updated}, skipped: ${skipped}, errored: ${errored}`);
    return { updated, skipped, errored };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
    console.log('Starting auth phone backfill script...');
    console.log(`Supabase URL: ${supabaseUrl}`);

    const resultsA = await upgradeUuidPseudoEmails();
    const resultsB = await backfillAuthPhone();

    console.log('\n=== Summary ===');
    console.log(`Operation A (UUID pseudo-email upgrade): upgraded=${resultsA.upgraded}, skipped=${resultsA.skipped}, errored=${resultsA.errored}`);
    console.log(`Operation B (auth.users.phone backfill): updated=${resultsB.updated}, skipped=${resultsB.skipped}, errored=${resultsB.errored}`);

    const totalErrors = resultsA.errored + resultsB.errored;
    if (totalErrors > 0) {
        console.error(`\n⚠ Completed with ${totalErrors} error(s). Review [*-ERROR] lines above.`);
        process.exit(1);
    } else {
        console.log('\n✓ All operations completed successfully.');
    }
}

main().catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
});
