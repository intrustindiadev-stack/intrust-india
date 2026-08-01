import assert from 'node:assert';
import { createClient } from '@supabase/supabase-js';
import {
  rupeesToPaise,
  paiseToRupees,
  calculateTeamPoolRounding,
  getIncentiveCapabilities
} from '../lib/hrm/incentives.ts';
import {
  CreateIndividualIncentiveSchema,
  CreateTeamIncentiveSchema,
  IncentiveTransitionSchema
} from '../lib/hrm/validation.ts';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is required in environment');
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runIncentivesIntegrationTests() {
  console.log('Running Incentives & Bonuses Production Hardening Integration Tests...\n');

  // ─────────────────────────────────────────────────────────────
  // SUITE 1: Validation Schemas & Financial Math Helpers
  // ─────────────────────────────────────────────────────────────
  console.log('--- Test Suite 1: Zod Validation & Financial Math ---');
  try {
    // 1.1 Conversion
    assert.strictEqual(rupeesToPaise(5000), 500000);
    assert.strictEqual(rupeesToPaise('1250.50'), 125050);
    assert.strictEqual(paiseToRupees(500000), 5000);

    // 1.2 Team Pool Division Rounding
    const poolMath = calculateTeamPoolRounding(100000, 3); // 1000 RS split between 3 employees
    assert.strictEqual(poolMath.perPersonPaise, 33333); // 333.33 RS
    assert.strictEqual(poolMath.remainderPaise, 1);     // 0.01 RS remainder

    // Total cost check: 33333 * 3 + 1 = 100000
    assert.strictEqual(poolMath.perPersonPaise * 3 + poolMath.remainderPaise, 100000);

    // 1.3 Validation: Reject negative / zero amount
    const invalidAmountRes = CreateIndividualIncentiveSchema.safeParse({
      recipient_mode: 'individual',
      employee_id: '00000000-0000-0000-0000-000000000001',
      incentive_type: 'performance_bonus',
      amount: -100
    });
    assert.strictEqual(invalidAmountRes.success, false, 'Negative amount must be rejected');

    // 1.4 Validation: Reject unknown request properties (.strict())
    const unknownPropRes = CreateIndividualIncentiveSchema.safeParse({
      recipient_mode: 'individual',
      employee_id: '00000000-0000-0000-0000-000000000001',
      incentive_type: 'performance_bonus',
      amount: 5000,
      client_injected_status: 'paid'
    });
    assert.strictEqual(unknownPropRes.success, false, 'Client-injected status must be rejected');

    console.log('✅ Passed Test Suite 1\n');
  } catch (err) {
    console.error('❌ Failed Test Suite 1', err);
    process.exit(1);
  }

  // ─────────────────────────────────────────────────────────────
  // SUITE 2: Capability Calculation & Maker-Checker Policy
  // ─────────────────────────────────────────────────────────────
  console.log('--- Test Suite 2: Capability Computation & Maker-Checker ---');
  try {
    const creatorId = '11111111-1111-1111-1111-111111111111';

    // Low-value award: HR Manager can approve self-created
    const hrLowValCaps = getIncentiveCapabilities('pending', 'hr_manager', creatorId, creatorId, 500000);
    assert.strictEqual(hrLowValCaps.canApprove, true);

    // High-value award (> 1 Lakh INR / 10,000,000 paise): HR Manager creator CANNOT approve self-created
    const hrHighValCaps = getIncentiveCapabilities('pending', 'hr_manager', creatorId, creatorId, 15000000);
    assert.strictEqual(hrHighValCaps.canApprove, false, 'HR Manager cannot self-approve high-value award');

    // High-value award: Admin CAN approve high-value self-created
    const adminHighValCaps = getIncentiveCapabilities('pending', 'admin', creatorId, creatorId, 15000000);
    assert.strictEqual(adminHighValCaps.canApprove, true, 'Admin can self-approve high-value award');

    // Paid award reversal: Only Admin / Super Admin can reverse
    const hrReversalCaps = getIncentiveCapabilities('paid', 'hr_manager', creatorId, 'other-id', 500000);
    assert.strictEqual(hrReversalCaps.canReverse, false, 'HR Manager cannot reverse paid award');

    const adminReversalCaps = getIncentiveCapabilities('paid', 'admin', creatorId, 'other-id', 500000);
    assert.strictEqual(adminReversalCaps.canReverse, true, 'Admin can reverse paid award');

    console.log('✅ Passed Test Suite 2\n');
  } catch (err) {
    console.error('❌ Failed Test Suite 2', err);
    process.exit(1);
  }

  // ─────────────────────────────────────────────────────────────
  // SUITE 3: Database RPCs & Concurrency Integration
  // ─────────────────────────────────────────────────────────────
  console.log('--- Test Suite 3: Database RPCs & Transaction Isolation ---');
  const testPrefix = `test_inc_${Date.now()}`;

  try {
    // Fetch test admin and employee profiles
    const { data: hrUsers } = await admin
      .from('user_profiles')
      .select('id')
      .in('role', ['hr_manager', 'admin', 'super_admin'])
      .limit(1);

    const { data: empUsers } = await admin
      .from('user_profiles')
      .select('id')
      .in('role', ['employee', 'relationship_exec'])
      .limit(2);

    const hrActorId = hrUsers?.[0]?.id || '00000000-0000-0000-0000-000000000001';
    const targetEmpId = empUsers?.[0]?.id || hrActorId;

    // 3.1 Award Individual Incentive RPC
    const idempotencyKey = `key_${testPrefix}`;
    const { data: indRes, error: indErr } = await admin.rpc('award_individual_incentive', {
      p_employee_id: targetEmpId,
      p_incentive_type: 'performance_bonus',
      p_amount_paise: 750000, // ₹7,500
      p_description: 'Integration test award',
      p_idempotency_key: idempotencyKey,
      p_caller_id: hrActorId
    });

    assert.ifError(indErr);
    assert.strictEqual(indRes.success, true);
    const batchId = indRes.batch_id;

    // 3.2 Idempotency Replay Check
    const { data: replayRes } = await admin.rpc('award_individual_incentive', {
      p_employee_id: targetEmpId,
      p_incentive_type: 'performance_bonus',
      p_amount_paise: 750000,
      p_idempotency_key: idempotencyKey,
      p_caller_id: hrActorId
    });
    assert.strictEqual(replayRes.success, true);
    assert.strictEqual(replayRes.code, 'DUPLICATE_IDEMPOTENT');
    assert.strictEqual(replayRes.batch_id, batchId);

    // 3.3 State Machine Transition: pending -> approved
    const { data: approveRes } = await admin.rpc('transition_incentive_batch', {
      p_batch_id: batchId,
      p_target_action: 'approve',
      p_expected_status: 'pending',
      p_expected_version: 1,
      p_caller_id: hrActorId
    });

    assert.strictEqual(approveRes.success, true);
    assert.strictEqual(approveRes.new_status, 'approved');
    assert.strictEqual(approveRes.version, 2);

    // 3.4 Stale Version Conflict Check (expect 409 conflict)
    const { data: staleRes } = await admin.rpc('transition_incentive_batch', {
      p_batch_id: batchId,
      p_target_action: 'mark_paid',
      p_expected_status: 'approved',
      p_expected_version: 1, // Stale version! Current version is 2
      p_caller_id: hrActorId
    });

    assert.strictEqual(staleRes.success, false);
    assert.strictEqual(staleRes.code, 'VERSION_CONFLICT');

    // 3.5 Invalid Transition Check (approved -> pending is illegal)
    const { data: invalidTransRes } = await admin.rpc('transition_incentive_batch', {
      p_batch_id: batchId,
      p_target_action: 'reject', // Only pending can be rejected
      p_expected_status: 'approved',
      p_expected_version: 2,
      p_caller_id: hrActorId
    });

    assert.strictEqual(invalidTransRes.success, false);
    assert.strictEqual(invalidTransRes.code, 'INVALID_TRANSITION');

    // 3.6 Transition: approved -> mark_paid
    const { data: paidRes } = await admin.rpc('transition_incentive_batch', {
      p_batch_id: batchId,
      p_target_action: 'mark_paid',
      p_expected_status: 'approved',
      p_expected_version: 2,
      p_caller_id: hrActorId
    });

    assert.strictEqual(paidRes.success, true);
    assert.strictEqual(paidRes.new_status, 'paid');

    console.log('✅ Passed Test Suite 3\n');
  } catch (err) {
    console.error('❌ Failed Test Suite 3', err);
    process.exit(1);
  }

  console.log('🎉 All Incentives Integration Tests Passed Successfully!');
}

runIncentivesIntegrationTests().catch((err) => {
  console.error('Unhandled test failure:', err);
  process.exit(1);
});
