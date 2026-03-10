'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Check, X } from 'lucide-react';
import FloatingLabelInput from './FloatingLabelInput';
import AutoFillBanner from './AutoFillBanner';
import { formatPANInput, validatePAN, maskPAN } from '@/app/types/kyc';
import { verifyPANAction } from '@/app/actions/kyc';

/**
 * @typedef {'idle' | 'loading' | 'verified' | 'manual_review' | 'error'} VerifyState
 */

/**
 * @typedef {Object} Step2PANProps
 * @property {Object} formData
 * @property {(field: string, value: string) => void} onChange
 * @property {Object<string, string>} errors
 * @property {boolean} panVerified
 * @property {boolean} showAutoFillBanner
 * @property {(panData: Object) => void} onPANVerified
 * @property {() => void} [onPANReset]
 * @property {Object<string, boolean>} fieldLocked
 * @property {(field: string) => void} onUnlock
 */

/** @param {Step2PANProps} props */
export default function Step2PAN({
    formData,
    onChange,
    errors,
    panVerified,
    showAutoFillBanner,
    onPANVerified,
    onPANReset,
    fieldLocked,
    onUnlock,
}) {
    /** @type {[VerifyState, Function]} */
    const [verifyState, setVerifyState] = useState(panVerified ? 'verified' : 'idle');
    const [verifyError, setVerifyError] = useState('');

    const maskedPAN =
        panVerified && formData.panNumber.length === 10
            ? maskPAN(formData.panNumber)
            : formData.panNumber;

    const handleVerifyPAN = async () => {
        if (!formData.panNumber || formData.panNumber.length !== 10) return;
        if (!validatePAN(formData.panNumber)) return;

        setVerifyState('loading');
        setVerifyError('');

        try {
            const result = await verifyPANAction(formData.panNumber);
            if (result.success) {
                setVerifyState(result.mode === 'manual_review' ? 'manual_review' : 'verified');
                onPANVerified(result.data || null, result.mode);
            } else {
                setVerifyState('error');
                setVerifyError(result.message || result.error || 'Verification failed');
            }
        } catch {
            setVerifyState('error');
            setVerifyError('Verification service unavailable');
        }
    };

    const handlePANChange = (/** @type {string} */ rawValue) => {
        const formatted = formatPANInput(rawValue).toUpperCase();
        onChange('panNumber', formatted);
        // Reset verification state when PAN changes
        if (verifyState !== 'idle') {
            setVerifyState('idle');
            setVerifyError('');
        }
        // Propagate reset to parent if PAN was previously verified
        if (panVerified && onPANReset) {
            onPANReset();
        }
    };

    return (
        <div className="space-y-6">
            {/* PAN Input Section */}
            <div className="space-y-3">
                <div className="relative">
                    <FloatingLabelInput
                        label="PAN Number"
                        value={verifyState === 'verified' ? maskedPAN : formData.panNumber}
                        onChange={(e) => handlePANChange(e.target.value)}
                        error={errors.panNumber || verifyError}
                        success={false} /* we use button for success now */
                        maxLength={10}
                        autoComplete="off"
                        locked={verifyState === 'verified'}
                        className="uppercase"
                    />

                    {/* Clear Button */}
                    {verifyState !== 'verified' && formData.panNumber.length > 0 && (
                        <button
                            type="button"
                            onClick={() => handlePANChange('')}
                            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-slate-400 hover:text-slate-600 transition-colors bg-white"
                            title="Clear PAN"
                        >
                            <X size={18} />
                        </button>
                    )}
                </div>

                {verifyState !== 'verified' && verifyState !== 'manual_review' && (
                    <div className="text-xs text-slate-500 font-medium ml-1">
                        Format: ABCDE1234F
                    </div>
                )}

                {verifyState === 'manual_review' && (
                    <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl">
                        <p className="text-sm text-amber-800 font-medium mb-2">
                            PAN Verification service is currently degraded.
                        </p>
                        <p className="text-xs text-amber-700 leading-relaxed mb-3">
                            You can proceed with your application, but it will require manual verification later. Ensure your details are exactly as on your PAN card.
                        </p>
                        <button
                            type="button"
                            onClick={handleVerifyPAN}
                            className="text-xs font-bold text-amber-700 hover:text-amber-900 transition-colors uppercase"
                        >
                            Retry Verification
                        </button>
                    </div>
                )}

                {/* Prominent Verify Button */}
                <button
                    type="button"
                    disabled={formData.panNumber.length !== 10 || verifyState === 'loading' || verifyState === 'verified' || verifyState === 'manual_review'}
                    onClick={handleVerifyPAN}
                    className={`w-full flex items-center justify-center gap-2 h-[52px] rounded-xl font-semibold text-[15px] transition-all
                        ${verifyState === 'verified' || verifyState === 'manual_review'
                            ? 'bg-[#16A34A] text-white shadow-[0_4px_12px_rgba(22,163,74,0.25)]'
                            : formData.panNumber.length === 10
                                ? 'bg-[#1A56DB] hover:bg-[#1546b5] text-white shadow-[0_4px_12px_rgba(26,86,219,0.25)]'
                                : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                        }`}
                >
                    {verifyState === 'idle' || verifyState === 'error' ? (
                        <>Verify PAN</>
                    ) : verifyState === 'loading' ? (
                        <><Loader2 size={18} className="animate-spin" /> Verifying...</>
                    ) : (
                        <><Check size={18} strokeWidth={3} /> {verifyState === 'manual_review' ? 'Proceeding Manually' : 'Verified'}</>
                    )}
                </button>
            </div>

            {/* Auto-fill banner */}
            <AutoFillBanner
                name={formData.fullName}
                visible={showAutoFillBanner}
            />

            {/* Father's Name — shown after PAN verification */}
            <AnimatePresence>
                {panVerified && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-1.5 pt-2"
                    >
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-slate-600 ml-1">Father&apos;s Name</label>
                            {fieldLocked.fatherName && (
                                <button
                                    type="button"
                                    onClick={() => onUnlock('fatherName')}
                                    className="text-xs font-bold text-[#1A56DB] hover:text-[#1546b5] transition-colors pl-2"
                                >
                                    EDIT
                                </button>
                            )}
                        </div>
                        <FloatingLabelInput
                            label="Enter Father's Name as per PAN"
                            labelClassName="!text-slate-400"
                            value={formData.fatherName}
                            onChange={(e) => onChange('fatherName', e.target.value)}
                            error={errors.fatherName}
                            locked={fieldLocked.fatherName}
                            autoComplete="off"
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

/**
 * Validates Step 2 fields.
 * @param {Object} formData
 * @param {boolean} panVerified
 * @returns {{ valid: boolean, errors: Object<string, string> }}
 */
export function validateStep2(formData, panVerified) {
    /** @type {Object<string, string>} */
    const errs = {};

    if (!validatePAN(formData.panNumber)) {
        errs.panNumber = 'Invalid PAN format. Expected: ABCDE1234F';
    }

    if (!panVerified) {
        errs.panNumber = errs.panNumber || 'Please verify your PAN before proceeding';
    }

    return { valid: Object.keys(errs).length === 0, errors: errs };
}
