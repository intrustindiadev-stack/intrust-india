'use client';

import { useState } from 'react';
import { Shield, Loader2, X } from 'lucide-react';
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
    const [showTerms, setShowTerms] = useState(false);
    const [showPrivacy, setShowPrivacy] = useState(false);

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
            <div className="flex flex-col">
                <label className="flex items-start gap-4 p-4 border border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-100/50 transition-colors cursor-pointer select-none">
                    <input
                        type="checkbox"
                        checked={formData.termsAccepted || false}
                        onChange={(e) => onChange('termsAccepted', e.target.checked)}
                        className={`mt-1 w-5 h-5 rounded border-2 border-slate-300 text-blue-600 focus:ring-blue-600 focus:ring-2 cursor-pointer transition-colors shrink-0 ${errors.termsAccepted ? 'border-red-500' : ''}`}
                    />
                    <div className="flex-1 text-sm text-slate-600 leading-relaxed">
                        I confirm that all information provided is accurate and authentic. By proceeding, I agree to Intrust's{' '}
                        <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowTerms(true); }} className="text-blue-600 font-semibold hover:underline cursor-pointer focus:outline-none">Terms of Service</button>
                        {' '}and{' '}
                        <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowPrivacy(true); }} className="text-blue-600 font-semibold hover:underline cursor-pointer focus:outline-none">Privacy Policy</button>.
                    </div>
                </label>
                {errors.termsAccepted && (
                    <p className="text-red-500 text-sm mt-2 ml-1 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        {errors.termsAccepted}
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

            {/* Modals */}
            {showTerms && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden">
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0">
                            <h3 className="font-bold text-lg text-slate-800">Terms of Service</h3>
                            <button type="button" onClick={() => setShowTerms(false)} className="p-2 hover:bg-slate-100 text-slate-500 rounded-full transition-colors"><X size={20}/></button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 text-sm text-slate-600 space-y-4 leading-relaxed">
                            <p><strong className="text-slate-800">1. Introduction</strong><br/>Welcome to Intrust. By submitting this Identity and Address Verification (KYC) application, you agree to be bound by these Terms of Service. Please read them carefully.</p>
                            <p><strong className="text-slate-800">2. Information Accuracy</strong><br/>You certify and declare that all the information, identification numbers, and details provided during this verification process are strictly true, accurate, and lawfully belong to you.</p>
                            <p><strong className="text-slate-800">3. Verification Process</strong><br/>Intrust is authorized to utilize reputable third-party verification agencies (such as SprintVerify) to validate the identity details and PAN records provided. Providing false or misleading information may lead to immediate account suspension and potential legal action.</p>
                            <p><strong className="text-slate-800">4. User Responsibilities</strong><br/>You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.</p>
                        </div>
                        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                            <button type="button" onClick={() => setShowTerms(false)} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-sm shadow-blue-600/20">I Understand</button>
                        </div>
                    </div>
                </div>
            )}

            {showPrivacy && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden">
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0">
                            <h3 className="font-bold text-lg text-slate-800">Privacy Policy</h3>
                            <button type="button" onClick={() => setShowPrivacy(false)} className="p-2 hover:bg-slate-100 text-slate-500 rounded-full transition-colors"><X size={20}/></button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 text-sm text-slate-600 space-y-4 leading-relaxed">
                            <p><strong className="text-slate-800">1. Data Collection</strong><br/>We collect your personal details—including your Full Name, Date of Birth, PAN, and Phone Number—solely for the purposes of identity verification, regulatory compliance, and account security.</p>
                            <p><strong className="text-slate-800">2. Data Encryption & Storage</strong><br/>Your PAN and sensitive identifiers are encrypted both in transit and at rest using bank-grade security protocols. We follow strict data minimization principles and do not store plaintext identification numbers unnecessarily.</p>
                            <p><strong className="text-slate-800">3. Data Sharing & Third Parties</strong><br/>Your information is securely transmitted only to recognized internal services and authenticated verification agencies. Intrust will never rent, sell, or unlawfully distribute your personal data to unauthorized third-party marketers.</p>
                            <p><strong className="text-slate-800">4. Your Rights</strong><br/>You retain the right to request the deletion of your account data, subject to regulatory retention mandates for financial and verification records.</p>
                        </div>
                        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                            <button type="button" onClick={() => setShowPrivacy(false)} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-sm shadow-blue-600/20">Close Policy</button>
                        </div>
                    </div>
                </div>
            )}
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
