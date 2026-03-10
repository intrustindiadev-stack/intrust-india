'use client';

import { Shield, Loader2 } from 'lucide-react';
import FloatingLabelInput from './FloatingLabelInput';
import { validateAddress } from '@/app/types/kyc';

/**
 * @typedef {Object} Step3AddressProps
 * @property {Object} formData
 * @property {(field: string, value: string | boolean) => void} onChange
 * @property {Object<string, string>} errors
 * @property {boolean} isSubmitting
 */

/** @param {Step3AddressProps} props */
export default function Step3Address({ formData, onChange, errors, isSubmitting }) {
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

            {/* Terms checkbox */}
            <label className="flex items-start gap-3 cursor-pointer group">
                <button
                    type="button"
                    role="checkbox"
                    aria-checked={formData.termsAccepted}
                    onClick={() => onChange('termsAccepted', !formData.termsAccepted)}
                    className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0 bg-white ${formData.termsAccepted
                        ? 'bg-electric border-electric'
                        : 'border-slate-300 hover:border-electric/60'
                        } ${errors.termsAccepted ? 'border-red-500' : ''}`}
                >
                    {formData.termsAccepted && (
                        <svg width="12" height="10" viewBox="0 0 12 10" fill="none" className="text-white">
                            <path
                                d="M1 5L4.5 8.5L11 1.5"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    )}
                </button>
                <span className="text-xs text-slate-600 leading-relaxed">
                    I confirm that all information provided is accurate and I agree to the{' '}
                    <span className="text-electric underline underline-offset-2">Terms of Service</span> and{' '}
                    <span className="text-electric underline underline-offset-2">Privacy Policy</span>.
                </span>
            </label>
            {errors.termsAccepted && (
                <p className="text-red-500 text-xs ml-8 -mt-3">{errors.termsAccepted}</p>
            )}

            {/* Submit button */}
            <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
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

    if (!formData.termsAccepted) {
        errs.termsAccepted = 'You must accept the terms to proceed';
    }

    return { valid: Object.keys(errs).length === 0, errors: errs };
}
