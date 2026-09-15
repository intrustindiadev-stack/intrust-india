'use client';

import { Shield, Loader2, ExternalLink } from 'lucide-react';
import FloatingLabelInput from './FloatingLabelInput';
import { validateAddress } from '@/app/types/kyc';

/**
 * @typedef {Object} Step3AddressProps
 * @property {Object} formData
 * @property {(field: string, value: string | boolean) => void} onChange
 * @property {Object<string, string>} errors
 * @property {boolean} isSubmitting
 */

/** @param {Step3AddressProps & { onOpenTerms: () => void, termsVersion: string }} props */
export default function Step3Address({ formData, onChange, errors, isSubmitting, onOpenTerms, termsVersion }) {

    return (
        <div className="space-y-5">
            {/* Full Address textarea */}
            <FloatingLabelInput
                label="Full Address"
                value={formData.fullAddress}
                onChange={(e) => onChange('fullAddress', e.target.value)}
                error={errors.fullAddress}
                isTextarea
                rows={3}
                autoComplete="street-address"
            />

            {/* City / State / PIN grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FloatingLabelInput
                    label="City"
                    value={formData.city}
                    onChange={(e) => onChange('city', e.target.value)}
                    error={errors.city}
                    autoComplete="address-level2"
                />
                <FloatingLabelInput
                    label="State"
                    value={formData.state}
                    onChange={(e) => onChange('state', e.target.value)}
                    error={errors.state}
                    autoComplete="address-level1"
                />
                <FloatingLabelInput
                    label="PIN Code"
                    value={formData.pinCode}
                    onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, '').substring(0, 6);
                        onChange('pinCode', digits);
                    }}
                    error={errors.pinCode}
                    maxLength={6}
                    type="tel"
                    autoComplete="postal-code"
                />
            </div>

            {/* Bank-Grade Security toggle */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <Shield size={18} className="text-electric shrink-0" />
                        <div>
                            <p className="text-slate-900 text-sm font-semibold">Enable Bank-Grade Security</p>
                            <p className="text-slate-500 text-xs mt-0.5">
                                Multi-factor authentication &amp; encrypted storage
                            </p>
                        </div>
                    </div>

                    {/* Custom toggle pill */}
                    <button
                        type="button"
                        role="switch"
                        aria-checked={formData.bankGradeSecurity}
                        onClick={() => onChange('bankGradeSecurity', !formData.bankGradeSecurity)}
                        className={`relative w-12 h-7 rounded-full transition-colors duration-200 shrink-0 ${formData.bankGradeSecurity ? 'bg-electric' : 'bg-slate-300'
                            }`}
                    >
                        <span
                            className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-200 ${formData.bankGradeSecurity ? 'translate-x-5' : 'translate-x-0'
                                }`}
                        />
                    </button>
                </div>
            </div>

            {/* Terms acceptance via scroll-to-accept modal */}
            <div className="flex flex-col">
                <button
                    type="button"
                    id="terms_accepted"
                    onClick={onOpenTerms}
                    aria-label={formData.termsAccepted ? 'Terms accepted — tap to re-read' : 'Read and accept KYC terms (opens modal)'}
                    className={[
                        'flex items-start gap-4 p-4 border rounded-xl transition-colors text-left w-full cursor-pointer min-h-[56px]',
                        formData.termsAccepted
                            ? 'border-emerald-300 bg-emerald-50/60 hover:bg-emerald-50'
                            : 'border-slate-200 bg-slate-50 hover:bg-blue-50/60 active:bg-blue-100/60',
                        errors.termsAccepted ? 'border-red-400 bg-red-50/30' : '',
                    ].filter(Boolean).join(' ')}
                >
                    {/* Checkbox visual indicator */}
                    <span
                        aria-hidden="true"
                        className={[
                            'mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors',
                            formData.termsAccepted
                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                : errors.termsAccepted
                                    ? 'border-red-400 bg-white text-transparent'
                                    : 'border-slate-300 bg-white text-transparent',
                        ].filter(Boolean).join(' ')}
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    </span>

                    {/* Label text */}
                    <span className="flex-1 text-sm text-slate-600 leading-relaxed">
                        {formData.termsAccepted ? (
                            <>
                                You accepted{' '}
                                <strong>Intrust India KYC Terms ({termsVersion || 'latest'})</strong>.
                                {' '}A signed PDF copy will be attached to your application.{' '}
                                <span className="text-blue-600 font-semibold">Read again</span>
                            </>
                        ) : (
                            <>
                                I confirm all information is accurate.{' '}
                                <span className="text-blue-600 font-semibold underline underline-offset-2">
                                    Read &amp; Accept Intrust India KYC Terms
                                </span>{' '}
                                to continue.
                            </>
                        )}
                    </span>

                    {/* Modal open hint icon */}
                    {!formData.termsAccepted && (
                        <ExternalLink
                            size={15}
                            aria-hidden="true"
                            className="shrink-0 mt-0.5 text-blue-500 opacity-70"
                        />
                    )}
                </button>

                {/* Helper text shown when terms not yet accepted */}
                {!formData.termsAccepted && !errors.termsAccepted && (
                    <p className="text-slate-400 text-xs mt-1.5 ml-1">
                        Tap above to open the terms — scroll to the bottom, then accept.
                    </p>
                )}

                {errors.termsAccepted && (
                    <p className="text-red-500 text-sm mt-2 ml-1 flex items-center gap-1">
                        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        {errors.termsAccepted}
                        {' '}—{' '}
                        <button
                            type="button"
                            onClick={onOpenTerms}
                            className="text-blue-600 underline underline-offset-2 font-semibold"
                        >
                            Open Terms
                        </button>
                    </p>
                )}
            </div>

            {/* Submit button */}
            <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none mt-4"
            >
                {isSubmitting ? (
                    <>
                        <Loader2 size={20} className="animate-spin" />
                        Submitting...
                    </>
                ) : (
                    'Submit Verification'
                )}
            </button>

        </div>
    );
}

/**
 * Validates Step 3 fields.
 * @param {Object} formData
 * @returns {{ valid: boolean, errors: Object<string, string> }}
 */
export function validateStep3(formData) {
    /** @type {Object<string, string>} */
    const errs = {};

    if (!validateAddress(formData.fullAddress)) {
        errs.fullAddress = 'Please enter a complete address (minimum 10 characters)';
    }

    if (!formData.city || formData.city.trim().length < 2) {
        errs.city = 'City is required';
    }

    if (!formData.state || formData.state.trim().length < 2) {
        errs.state = 'State is required';
    }

    if (!formData.pinCode || !/^\d{6}$/.test(formData.pinCode)) {
        errs.pinCode = 'Enter a valid 6-digit PIN code';
    }

    if (formData.termsAccepted !== true) {
        errs.termsAccepted = 'You must accept the terms to proceed';
    }

    return { valid: Object.keys(errs).length === 0, errors: errs };
}
