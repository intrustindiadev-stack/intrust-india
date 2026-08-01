import assert from 'node:assert';
import { createClient } from '@supabase/supabase-js';
import {
    TEAM_ROLES,
    getAuthorizedTeamScope,
    sanitizeUserProfile,
    teamCreateSchema,
    teamUpdateSchema,
    memberAssignSchema,
    memberBulkTransferSchema,
    teamDeactivateSchema,
    formatErrorResponse
} from '../lib/teamAuth.js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('SUPABASE_SERVICE_ROLE_KEY is required in environment');
    process.exit(1);
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runTeamIntegrationTests() {
    console.log('Running Team Management Production Hardening Integration Tests...\n');

    // ─────────────────────────────────────────────────────────────
    // PART 1: Validation Schemas & Unknown Key Rejection
    // ─────────────────────────────────────────────────────────────
    console.log('--- Test Suite 1: Zod Schemas & Request Validation ---');
    try {
        // Valid creation
        const validCreate = teamCreateSchema.parse({
            name: 'Test MP State Team',
            region_level: 'state',
            state: 'Madhya Pradesh'
        });
        assert.strictEqual(validCreate.name, 'Test MP State Team');
        assert.strictEqual(validCreate.color, '#6366f1');

        // Reject unknown request property
        const unknownPropResult = teamCreateSchema.safeParse({
            name: 'Test Team',
            region_level: 'state',
            state: 'Madhya Pradesh',
            forged_admin_override: true
        });
        assert.strictEqual(unknownPropResult.success, false, 'Should reject unknown request properties');

        // Reject invalid hex color
        const invalidColorResult = teamCreateSchema.safeParse({
            name: 'Test Team',
            region_level: 'state',
            color: 'red'
        });
        assert.strictEqual(invalidColorResult.success, false, 'Should reject invalid hex color');

        console.log('✅ Passed Test Suite 1\n');
    } catch (err) {
        console.error('❌ Failed Test Suite 1', err);
        process.exit(1);
    }

    // ─────────────────────────────────────────────────────────────
    // PART 2: Scope Calculations & Profile Sanitization
    // ─────────────────────────────────────────────────────────────
    console.log('--- Test Suite 2: Server Scope & Data Privacy Sanitization ---');
    try {
        const mockAdminUser = { id: '00000000-0000-0000-0000-000000000001' };
        const mockAdminProfile = { id: mockAdminUser.id, role: 'admin' };

        const adminScope = await getAuthorizedTeamScope(mockAdminUser, mockAdminProfile, admin);
        assert.strictEqual(adminScope.capabilities.canCreateTeam, true);
        assert.strictEqual(adminScope.capabilities.canEditTeam, true);
        assert.strictEqual(adminScope.capabilities.canDeactivateTeam, true);
        assert.strictEqual(adminScope.capabilities.canManageTeamIds, null);

        const mockExecUser = { id: '00000000-0000-0000-0000-00000002' };
        const mockExecProfile = { id: mockExecUser.id, role: 'relationship_exec', team_id: '00000000-0000-0000-0000-00000003' };

        const execScope = await getAuthorizedTeamScope(mockExecUser, mockExecProfile, admin);
        assert.strictEqual(execScope.capabilities.canCreateTeam, false);
        assert.strictEqual(execScope.capabilities.canEditTeam, false);
        assert.strictEqual(execScope.capabilities.canDeactivateTeam, false);
        assert.strictEqual(execScope.capabilities.canAssignMembers, false);

        // Profile Sanitization Data Privacy Check
        const sensitiveProfile = {
            id: 'u1',
            full_name: 'John Doe',
            email: 'john@example.com',
            phone: '+919999999999',
            role: 'relationship_exec',
            team_id: 't1'
        };

        const execView = sanitizeUserProfile(sensitiveProfile, 'relationship_exec');
        assert.strictEqual(execView.phone, undefined, 'Executive view must redact phone');
        assert.strictEqual(execView.email, undefined, 'Executive view must redact email');

        const adminView = sanitizeUserProfile(sensitiveProfile, 'admin');
        assert.strictEqual(adminView.phone, '+919999999999', 'Admin view retains contact details');
        assert.strictEqual(adminView.email, 'john@example.com', 'Admin view retains email');

        console.log('✅ Passed Test Suite 2\n');
    } catch (err) {
        console.error('❌ Failed Test Suite 2', err);
        process.exit(1);
    }

    // ─────────────────────────────────────────────────────────────
    // PART 3: DB & RPC Functional Hardening Integration
    // ─────────────────────────────────────────────────────────────
    console.log('--- Test Suite 3: Database RPCs, Hierarchy & Concurrency ---');

    // Create mock test users & teams in DB
    const testIdPrefix = `test_${Date.now()}`;
    const testAdminId = '10000000-0000-0000-0000-000000000001';
    const testManagerId = '10000000-0000-0000-0000-000000000002';
    const testExecId = '10000000-0000-0000-0000-000000000003';

    try {
        // Fetch real users from user_profiles
        const { data: adminProfiles } = await admin
            .from('user_profiles')
            .select('id, role')
            .in('role', ['admin', 'super_admin'])
            .limit(1);

        const { data: managers } = await admin
            .from('user_profiles')
            .select('id, role')
            .in('role', ['relationship_manager', 'admin', 'super_admin'])
            .limit(2);

        const { data: execs } = await admin
            .from('user_profiles')
            .select('id, role')
            .in('role', ['relationship_exec', 'employee'])
            .limit(2);

        const realAdminId = adminProfiles?.[0]?.id || testAdminId;
        const realManagerId = managers?.[0]?.id || realAdminId;
        const realExecId = execs?.[0]?.id || realManagerId;

        // 3.1: Create State Team
        const { data: stateRes, error: stateErr } = await admin.rpc('admin_create_team', {
            p_name: `Test State Team ${testIdPrefix}`,
            p_region_level: 'state',
            p_state: 'Madhya Pradesh',
            p_caller_id: realAdminId
        });

        assert.ifError(stateErr);
        assert.strictEqual(stateRes.success, true);
        const stateTeamId = stateRes.team_id;

        // 3.2: Create City Team attached to State Team
        const { data: cityRes, error: cityErr } = await admin.rpc('admin_create_team', {
            p_name: `Test City Team ${testIdPrefix}`,
            p_region_level: 'city',
            p_state: 'Madhya Pradesh',
            p_city: 'Bhopal',
            p_parent_team_id: stateTeamId,
            p_team_lead_id: realManagerId,
            p_caller_id: realAdminId
        });

        assert.ifError(cityErr);
        assert.strictEqual(cityRes.success, true);
        const cityTeamId = cityRes.team_id;

        // 3.3: Attempt to create invalid city team without parent -> expect failure
        const { data: invalidCityRes } = await admin.rpc('admin_create_team', {
            p_name: `Invalid City ${testIdPrefix}`,
            p_region_level: 'city',
            p_state: 'Madhya Pradesh',
            p_city: 'Bhopal',
            p_parent_team_id: null,
            p_caller_id: realAdminId
        });
        assert.strictEqual(invalidCityRes?.success, false, 'City team without state parent must fail');

        // 3.4: Cycle Prevention Check
        const { data: cycleRes } = await admin.rpc('admin_update_team', {
            p_team_id: stateTeamId,
            p_parent_team_id: cityTeamId,
            p_caller_id: realAdminId
        });
        assert.strictEqual(cycleRes?.success, false, 'Cycle insertion (state parented by city) must fail');

        // 3.5: Assign Member & Verify Audit Log Creation
        const { data: assignRes } = await admin.rpc('admin_add_team_member', {
            p_team_id: cityTeamId,
            p_user_id: realExecId,
            p_caller_id: realAdminId,
            p_reason: 'Testing atomic assignment'
        });
        assert.strictEqual(assignRes.success, true);

        // Verify audit log entry written in audit_logs_crm
        const { data: auditLogs } = await admin
            .from('audit_logs_crm')
            .select('*')
            .eq('record_id', realExecId)
            .eq('action', 'ASSIGN_TEAM_MEMBER')
            .order('created_at', { ascending: false });

        assert.ok(auditLogs && auditLogs.length > 0, 'Audit log must be written atomically for member assignment');

        // 3.6: Optimistic Concurrency Control Test
        // Attempt update with stale version
        const { data: staleUpdateRes } = await admin.rpc('admin_update_team', {
            p_team_id: cityTeamId,
            p_expected_version: 999, // Stale version
            p_name: 'Conflict Update Name',
            p_caller_id: realAdminId
        });

        assert.strictEqual(staleUpdateRes.success, false);
        assert.strictEqual(staleUpdateRes.code, 'VERSION_CONFLICT', 'Stale version must return VERSION_CONFLICT');

        // 3.7: Deactivation Protection with Active Children
        const { data: deactParentRes } = await admin.rpc('admin_deactivate_team', {
            p_team_id: stateTeamId,
            p_caller_id: realAdminId,
            p_reason: 'Testing parent deactivation'
        });
        assert.strictEqual(deactParentRes.success, false);
        assert.strictEqual(deactParentRes.code, 'TEAM_HAS_CHILDREN', 'Cannot deactivate parent team with active children');

        // Clean up test teams created during test
        await admin.rpc('admin_deactivate_team', { p_team_id: cityTeamId, p_caller_id: realAdminId, p_reason: 'Cleanup' });
        await admin.rpc('admin_deactivate_team', { p_team_id: stateTeamId, p_caller_id: realAdminId, p_reason: 'Cleanup' });

        console.log('✅ Passed Test Suite 3\n');
    } catch (err) {
        console.error('❌ Failed Test Suite 3', err);
        process.exit(1);
    }

    console.log('🎉 All Team Management Integration Tests Passed Successfully!');
}

runTeamIntegrationTests().catch((err) => {
    console.error('Unhandled test failure:', err);
    process.exit(1);
});
