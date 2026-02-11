'use client';

/**
 * Enhanced KYC Verification Form Component
 * 
 * A production-ready KYC form with:
 * - Real-time validation
 * - Auto-formatting (PAN, phone)
 * - Server Action integration
 * - Loading states
 * - Toast notifications
 * - Bank-grade security checkbox
 * 
 * @component
 */

import { useState, useEffect } from 'react';
import { CheckCircle, Shield, ChevronRight, AlertCircle, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { submitKYC } from '@/app/actions/kyc';
import {
    validateKYCForm,
    formatPANInput,
    formatPhoneInput,
    sanitizeKYCData
} from '@/app/types/kyc';

/**
 * @typedef {Object} KYCFormProps
 * @property {Object} [initialData] - Pre-fill form data
 * @property {Function} [onSuccess] - Callback after successful submission
 * @property {Function} [onError] - Callback on submission error
 * @property {string} [userType] - Type of user (merchant, customer) for customization
 */

export default function KYCForm({
    initialData = {},
    onSuccess = null,
    onError = null,
    userType = 'customer'
}) {
    const [formData, setFormData] = useState({
        fullName: initialData.fullName || '',
        phoneNumber: initialData.phone || initialData.phoneNumber || '',
        dateOfBirth: initialData.dateOfBirth || '',
        panNumber: initialData.panNumber || initialData.panCard || '',
        fullAddress: initialData.address || initialData.fullAddress || '',
        bankGradeSecurity: initialData.bankGradeSecurity || false
    });

    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Real-time validation on field blur
    const validateField = (fieldName, value) => {
        const fieldData = { ...formData, [fieldName]: value };
        const validation = validateKYCForm(sanitizeKYCData(fieldData));

        if (validation.errors[fieldName]) {
            setErrors(prev => ({ ...prev, [fieldName]: validation.errors[fieldName] }));
        } else {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[fieldName];
                return newErrors;
            });
        }
    };

    const handleBlur = (fieldName) => {
        setTouched(prev => ({ ...prev, [fieldName]: true }));
        validateField(fieldName, formData[fieldName]);
    };

    const handleChange = (fieldName, value) => {
        setFormData(prev => ({ ...prev, [fieldName]: value }));

        // Clear error when user starts typing
        if (touched[fieldName] && errors[fieldName]) {
            validateField(fieldName, value);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Mark all fields as touched
        setTouched({
            fullName: true,
            phoneNumber: true,
            dateOfBirth: true,
            panNumber: true,
            fullAddress: true
        });

        // Validate entire form
        const sanitized = sanitizeKYCData(formData);
        const validation = validateKYCForm(sanitized);

        if (!validation.valid) {
            setErrors(validation.errors);
            toast.error(Object.values(validation.errors)[0] || 'Please fix the errors in the form');
            return;
        }

        setIsSubmitting(true);

        try {
            const result = await submitKYC(sanitized);

            if (result.success) {
                toast.success(result.message || 'KYC verification submitted successfully!', {
                    duration: 5000,
                    icon: '✅'
                });

                // Reset form
                setFormData({
                    fullName: '',
                    phoneNumber: '',
                    dateOfBirth: '',
                    panNumber: '',
                    fullAddress: '',
                    bankGradeSecurity: false
                });
                setTouched({});
                setErrors({});

                // Call success callback if provided
                if (onSuccess) {
                    onSuccess(result.data);
                }
            } else {
                console.error('KYC submission failed:', JSON.stringify(result, null, 2));
                toast.error(result.error || 'Failed to submit KYC verification', {
                    duration: 5000,
                    icon: '❌'
                });

                // Set field-specific errors if available
                if (result.errors) {
                    setErrors(result.errors);
                }

                // Call error callback if provided
                if (onError) {
                    onError(result.error);
                }
            }
        } catch (error) {
            console.error('Error submitting KYC:', error);
            toast.error('An unexpected error occurred. Please try again.');

            if (onError) {
                onError(error.message);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto rounded-3xl bg-white shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
            <div className="bg-gradient-to-r from-slate-50 to-blue-50/30 p-6 border-b border-slate-100">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">KYC Verification</h2>
                        <p className="text-sm text-slate-500">Complete your profile to unlock full access</p>
                    </div>
                    <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold border border-blue-100 flex items-center gap-1">
                        <Shield size={12} />
                        Secure
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FloatingInput
                        label="Full Name"
                        value={formData.fullName}
                        onChange={e => handleChange('fullName', e.target.value)}
                        onBlur={() => handleBlur('fullName')}
                        error={touched.fullName ? errors.fullName : null}
                        placeholder="Enter your full name"
                        autoComplete="name"
                    />

                    <FloatingInput
                        label="Phone Number"
                        value={formData.phoneNumber}
                        onChange={e => handleChange('phoneNumber', formatPhoneInput(e.target.value))}
                        onBlur={() => handleBlur('phoneNumber')}
                        error={touched.phoneNumber ? errors.phoneNumber : null}
                        type="tel"
                        maxLength={10}
                        placeholder="10-digit mobile number"
                        autoComplete="tel"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <FloatingInput
                            label="Date of Birth"
                            value={formData.dateOfBirth}
                            onChange={e => handleChange('dateOfBirth', e.target.value)}
                            onBlur={() => handleBlur('dateOfBirth')}
                            error={touched.dateOfBirth ? errors.dateOfBirth : null}
                            type="date"
                            autoComplete="bday"
                        />
                        <p className="text-xs text-slate-400 mt-1 ml-1 flex items-center gap-1">
                            <Info size={10} /> Must be 18 years or older
                        </p>
                    </div>

                    <div>
                        <FloatingInput
                            label="PAN Number"
                            value={formData.panNumber}
                            onChange={e => handleChange('panNumber', formatPANInput(e.target.value))}
                            onBlur={() => handleBlur('panNumber')}
                            error={touched.panNumber ? errors.panNumber : null}
                            maxLength={10}
                            placeholder="ABCDE1234F"
                            autoComplete="off"
                        />
                        <p className="text-xs text-slate-400 mt-1 ml-1">
                            Format: 5 letters + 4 digits + 1 letter
                        </p>
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 ml-1">Full Address</label>
                    <textarea
                        className={`w-full px-4 py-3 bg-slate-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none font-medium text-slate-900 resize-none ${touched.fullAddress && errors.fullAddress ? 'border-red-300' : 'border-slate-200'
                            }`}
                        rows="3"
                        placeholder="Enter your complete address"
                        value={formData.fullAddress}
                        onChange={e => handleChange('fullAddress', e.target.value)}
                        onBlur={() => handleBlur('fullAddress')}
                        autoComplete="street-address"
                    />
                    {touched.fullAddress && errors.fullAddress && (
                        <p className="text-red-500 text-xs mt-1 ml-1 flex items-center gap-1">
                            <AlertCircle size={10} /> {errors.fullAddress}
                        </p>
                    )}
                </div>

                {/* Bank Grade Security Checkbox */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <label className="flex items-start gap-3 cursor-pointer group">
                        <input
                            type="checkbox"
                            checked={formData.bankGradeSecurity}
                            onChange={e => handleChange('bankGradeSecurity', e.target.checked)}
                            className="mt-1 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500/20"
                        />
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <Shield size={16} className="text-blue-600" />
                                <span className="font-bold text-slate-900 text-sm">Enable Bank-Grade Security</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                Add an extra layer of protection with multi-factor authentication and encrypted data storage.
                                Recommended for high-value transactions.
                            </p>
                        </div>
                    </label>
                </div>

                {/* Submit Button */}
                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                    >
                        {isSubmitting ? (
                            <>
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                                />
                                Submitting...
                            </>
                        ) : (
                            <>
                                Submit Verification
                                <ChevronRight size={18} />
                            </>
                        )}
                    </button>
                </div>

                {/* Help Text */}
                <p className="text-center text-xs text-slate-400">
                    Your information is encrypted and secure. We never share your data with third parties.
                </p>
            </form>
        </div>
    );
}

/**
 * Floating Label Input Component
 */
function FloatingInput({ label, error, className = '', ...props }) {
    return (
        <div className="w-full">
            <div className="relative group">
                <input
                    className={`w-full px-4 py-3.5 bg-slate-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none font-medium placeholder:text-transparent peer ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-200'
                        } ${className}`}
                    placeholder={label}
                    {...props}
                />
                <label
                    className={`absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm transition-all pointer-events-none 
            peer-focus:-top-2 peer-focus:left-2 peer-focus:text-xs peer-focus:text-blue-600 peer-focus:bg-white peer-focus:px-2 peer-focus:font-bold 
            peer-[:not(:placeholder-shown)]:-top-2 peer-[:not(:placeholder-shown)]:left-2 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-slate-500 peer-[:not(:placeholder-shown)]:bg-white peer-[:not(:placeholder-shown)]:px-2
            ${error ? 'peer-focus:text-red-500 peer-[:not(:placeholder-shown)]:text-red-500' : ''}`}
                >
                    {label}
                </label>
            </div>
            {error && (
                <p className="text-red-500 text-xs mt-1 ml-1 flex items-center gap-1">
                    <AlertCircle size={10} /> {error}
                </p>
            )}
        </div>
    );
}
