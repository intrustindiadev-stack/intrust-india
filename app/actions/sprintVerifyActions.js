'use server';

import { sprintVerify } from '@/lib/sprintVerify';

/**
 * Server Action to verify GSTIN
 * Runs on server, has access to private ENV variables
 */
export async function verifyGSTIN(gstin) {
    if (!gstin) return { valid: false, message: 'GSTIN is required' };

    try {
        console.log('[ServerAction] Verifying GSTIN:', gstin);
        return await sprintVerify.verifyGSTIN(gstin);
    } catch (error) {
        console.error('[ServerAction] GSTIN Verification Error:', error);
        return {
            valid: 'manual_review',
            message: 'Verification failed, manual review required',
            error: error.message
        };
    }
}

/**
 * Server Action to verify Bank Account (Penny Drop)
 */
export async function verifyBank(account, ifsc) {
    if (!account || !ifsc) return { valid: false, message: 'Account and IFSC required' };

    try {
        console.log('[ServerAction] Verifying Bank:', account, ifsc);
        return await sprintVerify.verifyBank(account, ifsc);
    } catch (error) {
        console.error('[ServerAction] Bank Verification Error:', error);
        return {
            valid: 'manual_review',
            message: 'Verification failed, manual review required',
            error: error.message
        };
    }
}

/**
 * Server Action to verify PAN
 */
export async function verifyPAN(panNumber) {
    if (!panNumber) return { valid: false, message: 'PAN is required' };

    try {
        console.log('[ServerAction] Verifying PAN:', panNumber);
        return await sprintVerify.verifyPAN(panNumber);
    } catch (error) {
        console.error('[ServerAction] PAN Verification Error:', error);
        return {
            valid: 'manual_review',
            message: 'Verification failed, manual review required',
            error: error.message
        };
    }
}

