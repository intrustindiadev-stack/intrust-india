import fs from 'fs';
import path from 'path';

describe('CUST-03: Referral code unique constraint check', () => {
    it('should verify that a DB-level UNIQUE constraint exists on the referral_code column for user_profiles and merchants in the schema definition', () => {
        // Read the schema backup file that represents the source of truth for the database structure
        const backupPath = path.resolve(__dirname, '../supabase_backup_2026-06-05.sql');
        expect(fs.existsSync(backupPath)).toBe(true);

        const sqlContent = fs.readFileSync(backupPath, 'utf8');

        // 1. Assert unique constraint exists for public.user_profiles (referral_code)
        // In PostgreSQL pg_dump, a unique constraint is dumped as:
        // ALTER TABLE ONLY public.user_profiles
        //     ADD CONSTRAINT user_profiles_referral_code_key UNIQUE (referral_code);
        const userProfileConstraintRegex = /ALTER TABLE ONLY public\.user_profiles\s+ADD CONSTRAINT user_profiles_referral_code_key UNIQUE\s*\(referral_code\)/i;
        expect(userProfileConstraintRegex.test(sqlContent)).toBe(true);

        // 2. Assert unique constraint exists for public.merchants (referral_code)
        // Dumped as:
        // ALTER TABLE ONLY public.merchants
        //     ADD CONSTRAINT merchants_referral_code_key UNIQUE (referral_code);
        const merchantConstraintRegex = /ALTER TABLE ONLY public\.merchants\s+ADD CONSTRAINT merchants_referral_code_key UNIQUE\s*\(referral_code\)/i;
        expect(merchantConstraintRegex.test(sqlContent)).toBe(true);

        // 3. Verify regular lookup indexes are also created for fast search
        const userProfileIndexRegex = /CREATE INDEX idx_user_profiles_referral_code ON public\.user_profiles USING btree \(referral_code\)/i;
        expect(userProfileIndexRegex.test(sqlContent)).toBe(true);

        const merchantIndexRegex = /CREATE INDEX idx_merchants_referral_code ON public\.merchants USING btree \(referral_code\)/i;
        expect(merchantIndexRegex.test(sqlContent)).toBe(true);
    });

    it('should verify that migrations contain ALTER TABLE statement to add UNIQUE constraint to referral_code', () => {
        const migrationsDir = path.resolve(__dirname, '../supabase/migrations');
        expect(fs.existsSync(migrationsDir)).toBe(true);

        const migrationFiles = fs.readdirSync(migrationsDir);
        let foundUserProfileUnique = false;
        let foundMerchantUnique = false;

        migrationFiles.forEach(file => {
            const filePath = path.join(migrationsDir, file);
            if (fs.statSync(filePath).isFile()) {
                const content = fs.readFileSync(filePath, 'utf8');
                if (content.includes('ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE') || 
                    content.includes('referral_code TEXT UNIQUE') ||
                    content.includes('ADD CONSTRAINT user_profiles_referral_code_key UNIQUE') ||
                    content.includes('referral_code text UNIQUE')) {
                    foundUserProfileUnique = true;
                }
                if (content.includes('referral_code TEXT UNIQUE') ||
                    content.includes('ADD CONSTRAINT merchants_referral_code_key UNIQUE') ||
                    content.includes('referral_code TEXT UNIQUE') || 
                    content.includes('referral_code text UNIQUE') ||
                    content.includes('ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE') ||
                    content.includes('referral_code text UNIQUE') ||
                    content.includes('referral_code TEXT') && content.includes('UNIQUE')) {
                    foundMerchantUnique = true;
                }
            }
        });

        expect(foundUserProfileUnique).toBe(true);
        expect(foundMerchantUnique).toBe(true);
    });
});
