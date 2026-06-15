const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

async function main() {
    // Automatically load .env.local if present
    const envPath = path.join(__dirname, '..', '.env.local');
    if (fs.existsSync(envPath)) {
        const envFile = fs.readFileSync(envPath, 'utf-8');
        envFile.split('\n').forEach(line => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) return;
            const index = trimmed.indexOf('=');
            if (index === -1) return;
            const key = trimmed.slice(0, index).trim();
            let val = trimmed.slice(index + 1).trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                val = val.slice(1, -1);
            }
            if (!process.env[key]) {
                process.env[key] = val;
            }
        });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.warn('Skipping migration drift check: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY is not defined.');
        process.exit(0);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Fetching applied migrations from remote database...');
    let remoteVersions = new Set();
    const { execSync } = require('child_process');
    try {
        // Run psql inside docker to get actual tables and policies, and migrations
        const psqlCmd = `docker exec supabase-db psql -U supabase_admin -d postgres -t -c "SELECT version FROM supabase_migrations.schema_migrations;"`;
        const output = execSync(psqlCmd, { encoding: 'utf-8' });
        output.split('\n').forEach(line => {
            const v = line.trim();
            if (v) remoteVersions.add(v);
        });
        
        // Also verify key tables exist
        const tablesCmd = `docker exec supabase-db psql -U supabase_admin -d postgres -t -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public';"`;
        const tablesOut = execSync(tablesCmd, { encoding: 'utf-8' });
        const tables = new Set(tablesOut.split('\n').map(l => l.trim()).filter(Boolean));
        if (!tables.has('user_profiles') || !tables.has('shopping_products')) {
            console.warn('⚠️ WARNING: Essential tables (user_profiles, shopping_products) missing from public schema!');
        } else {
            console.log('✅ Verified essential tables exist in public schema.');
        }

        // Verify policies exist
        const policiesCmd = `docker exec supabase-db psql -U supabase_admin -d postgres -t -c "SELECT policyname FROM pg_policies WHERE schemaname = 'public';"`;
        const policiesOut = execSync(policiesCmd, { encoding: 'utf-8' });
        const policies = new Set(policiesOut.split('\n').map(l => l.trim()).filter(Boolean));
        if (policies.size === 0) {
            console.warn('⚠️ WARNING: No RLS policies found in public schema!');
        } else {
            console.log(`✅ Verified ${policies.size} RLS policies exist.`);
        }
        
    } catch (e) {
        console.warn('⚠️ Could not connect to docker container for deep inspection. Falling back to RPC...');
        const { data: remoteMigrations, error } = await supabase.rpc('get_applied_migrations');
        if (error) {
            console.error('Error fetching remote migrations:', error);
            process.exit(1);
        }
        remoteVersions = new Set((remoteMigrations || []).map(m => m.version));
    }

    console.log(`Found ${remoteVersions.size} applied migrations in remote database.`);

    const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
    if (!fs.existsSync(migrationsDir)) {
        console.error(`Local migrations directory not found at ${migrationsDir}`);
        process.exit(1);
    }

    const localFiles = fs.readdirSync(migrationsDir);
    const unapplied = [];

    for (const file of localFiles) {
        if (!file.endsWith('.sql')) continue;
        const match = file.match(/^(\d+)_/);
        if (!match) continue;
        const version = match[1];
        if (!remoteVersions.has(version)) {
            unapplied.push(file);
        }
    }

    if (unapplied.length > 0) {
        console.error('\n❌ SCHEMA DRIFT DETECTED: The following local migration files have not been applied to the remote database:');
        unapplied.forEach(file => console.error(`   - ${file}`));
        console.error('\nPlease apply these migrations to the remote database to reconcile drift.\n');
        process.exit(1);
    }

    console.log('\n✅ No migration drift detected. Remote database is fully up to date with local migrations.\n');
    process.exit(0);
}

main().catch(err => {
    console.error('Unhandled error during migration drift check:', err);
    process.exit(1);
});
