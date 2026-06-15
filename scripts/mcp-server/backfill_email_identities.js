import pg from 'pg';
const { Pool } = pg;

async function run() {
    console.log('Starting Email Identity Backfill and RPC Deployment...');
    
    // Use env vars from .env.local via --env-file or manual config
    const pool = new Pool({
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'postgres',
        port: process.env.DB_PORT || 5432,
    });

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        console.log('1. Deploying admin_link_email_identity RPC...');
        // Create the RPC function to allow Supabase JS client to insert email identities
        const rpcQuery = `
        CREATE OR REPLACE FUNCTION public.admin_link_email_identity(target_user_id uuid, target_email text)
        RETURNS void
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        BEGIN
            INSERT INTO auth.identities (id, user_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
            VALUES (
                target_user_id, -- for email provider, identity_id is usually same as user_id
                target_user_id,
                'email',
                jsonb_build_object('sub', target_user_id, 'email', target_email, 'email_verified', true),
                now(),
                now(),
                now()
            )
            ON CONFLICT (provider, id) DO NOTHING;
        END;
        $$;
        `;
        await client.query(rpcQuery);
        console.log('✅ RPC admin_link_email_identity deployed.');

        console.log('2. Backfilling existing users...');
        // Find users with encrypted_password but no email identity
        const findQuery = `
            SELECT u.id, u.email
            FROM auth.users u
            LEFT JOIN auth.identities i ON u.id = i.user_id AND i.provider = 'email'
            WHERE u.encrypted_password IS NOT NULL 
              AND u.encrypted_password != ''
              AND i.id IS NULL;
        `;
        const { rows: usersToFix } = await client.query(findQuery);

        console.log(`Found ${usersToFix.length} users needing email identity backfill.`);

        for (const user of usersToFix) {
            console.log(`Backfilling email identity for user: ${user.id} (${user.email})`);
            
            // Insert identity
            const insertIdentityQuery = `
                INSERT INTO auth.identities (id, user_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
                VALUES ($1, $1, 'email', $2, now(), now(), now())
                ON CONFLICT (provider, id) DO NOTHING;
            `;
            const identityData = JSON.stringify({
                sub: user.id,
                email: user.email,
                email_verified: true
            });
            await client.query(insertIdentityQuery, [user.id, identityData]);
            
            // Ensure app_metadata.providers includes 'email'
            const updateMetaQuery = `
                UPDATE auth.users 
                SET raw_app_meta_data = 
                    CASE 
                        WHEN raw_app_meta_data->'providers' @> '"email"'::jsonb THEN raw_app_meta_data
                        WHEN raw_app_meta_data ? 'providers' THEN jsonb_set(raw_app_meta_data, '{providers}', (raw_app_meta_data->'providers') || '["email"]'::jsonb)
                        ELSE jsonb_set(COALESCE(raw_app_meta_data, '{}'::jsonb), '{providers}', '["email"]'::jsonb)
                    END
                WHERE id = $1;
            `;
            await client.query(updateMetaQuery, [user.id]);
        }

        await client.query('COMMIT');
        console.log('✅ Backfill completed successfully.');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ Error during backfill:', e);
    } finally {
        client.release();
        await pool.end();
    }
}

run();
