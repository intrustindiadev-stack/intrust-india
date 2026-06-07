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
    const { data: remoteMigrations, error } = await supabase
        .rpc('get_applied_migrations');

    if (error) {
        console.error('Error fetching remote migrations:', error);
        process.exit(1);
    }

    const remoteVersions = new Set((remoteMigrations || []).map(m => m.version));
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
