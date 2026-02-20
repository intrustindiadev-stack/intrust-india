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
import { submitKYC, verifyPANAction } from '@/app/actions/kyc'; // Import verify action
import {
    validateKYCForm,
    formatPANInput,
    formatPhoneInput,
    sanitizeKYCData
} from '@/app/types/kyc';
import { Camera, Upload, Check, Loader } from 'lucide-react'; // Add icons

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
        bankGradeSecurity: initialData.bankGradeSecurity || false,
        // Files (stored as File objects)
        selfieImage: null,
        idDocumentFront: null
    });

    const [panVerified, setPanVerified] = useState(false);
    const [verifyingPan, setVerifyingPan] = useState(false);

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

    const handleFileChange = (fieldName, e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData(prev => ({ ...prev, [fieldName]: file }));
            // Clear error if any
            if (errors[fieldName]) {
                setErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors[fieldName];
                    return newErrors;
                });
            }
        }
    };

    const handleVerifyPAN = async () => {
        if (!formData.panNumber || formData.panNumber.length !== 10) {
            toast.error('Please enter a valid PAN number first');
            return;
        }
        setVerifyingPan(true);
        try {
            const result = await verifyPANAction(formData.panNumber);
            if (result.success) {
                setPanVerified(true);
                toast.success('PAN Verified Successfully!');
            } else {
                setPanVerified(false);
                toast.error(result.message || 'PAN Verification Failed');
            }
        } catch (err) {
            toast.error('Verification failed');
        } finally {
            setVerifyingPan(false);
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

        // Simple File Validation
        const newErrors = {};
        if (!formData.selfieImage) newErrors.selfieImage = 'Selfie is required';
        if (!formData.idDocumentFront) newErrors.idDocumentFront = 'ID Document is required';

        // Validate text fields
        const sanitized = sanitizeKYCData(formData);
        const validation = validateKYCForm(sanitized);

        if (!validation.valid || Object.keys(newErrors).length > 0) {
            const allErrors = { ...validation.errors, ...newErrors };
            setErrors(allErrors);
            toast.error('Please complete all required fields');
            return;
        }

        setIsSubmitting(true);

        try {
            // Need to use FormData for file upload support in Server Actions
            const submitData = new FormData();
            submitData.append('fullName', formData.fullName);
            submitData.append('phoneNumber', formData.phoneNumber);
            submitData.append('dateOfBirth', formData.dateOfBirth);
            submitData.append('panNumber', formData.panNumber);
            submitData.append('fullAddress', formData.fullAddress);
            submitData.append('bankGradeSecurity', formData.bankGradeSecurity);

            if (formData.selfieImage) submitData.append('selfieImage', formData.selfieImage);
            if (formData.idDocumentFront) submitData.append('idDocumentFront', formData.idDocumentFront);

            const result = await submitKYC(submitData);

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

                </div>

                <div>
                    <div className="relative">
                        <FloatingInput
                            label="PAN Number"
                            value={formData.panNumber}
                            onChange={e => {
                                handleChange('panNumber', formatPANInput(e.target.value));
                                setPanVerified(false); // Reset verification on change
                            }}
                            onBlur={() => handleBlur('panNumber')}
                            error={touched.panNumber ? errors.panNumber : null}
                            maxLength={10}
                            placeholder="ABCDE1234F"
                            autoComplete="off"
                        />
                        <button
                            type="button"
                            onClick={handleVerifyPAN}
                            disabled={verifyingPan || !formData.panNumber || formData.panNumber.length < 10 || panVerified}
                            className={`absolute right-2 top-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${panVerified
                                ? 'bg-green-100 text-green-700 cursor-default'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                                }`}
                        >
                            {verifyingPan ? <Loader size={12} className="animate-spin" /> : null}
                            {panVerified ? 'Verified' : 'Verify'}
                            {panVerified ? <Check size={12} /> : null}
                        </button>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 ml-1">
                        Format: 5 letters + 4 digits + 1 letter
                    </p>
                </div>

                {/* File Upload Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    {/* Selfie Upload */}
                    <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${formData.selfieImage ? 'border-green-300 bg-green-50' : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50'
                        }`}>
                        <div className="flex flex-col items-center gap-3">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${formData.selfieImage ? 'bg-green-100 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                                <Camera size={24} />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900 text-sm">Upload Selfie</h4>
                                <p className="text-xs text-slate-500 mb-3">Clear photo of your face</p>
                                <input
                                    type="file"
                                    accept="image/*"
                                    capture="user"
                                    onChange={(e) => handleFileChange('selfieImage', e)}
                                    className="hidden"
                                    id="selfie-upload"
                                />
                                <label
                                    htmlFor="selfie-upload"
                                    className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 cursor-pointer hover:bg-slate-50"
                                >
                                    {formData.selfieImage ? 'Change Photo' : 'Open Camera / Upload'}
                                </label>
                                {formData.selfieImage && (
                                    <p className="text-xs text-green-600 font-medium mt-2">
                                        Selected: {formData.selfieImage.name}
                                    </p>
                                )}
                                {errors.selfieImage && <p className="text-xs text-red-500 mt-2">{errors.selfieImage}</p>}
                            </div>
                        </div>
                    </div>

                    {/* ID Document Upload */}
                    <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${formData.idDocumentFront ? 'border-green-300 bg-green-50' : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50'
                        }`}>
                        <div className="flex flex-col items-center gap-3">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${formData.idDocumentFront ? 'bg-green-100 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                                <Upload size={24} />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900 text-sm">ID Document (Front)</h4>
                                <p className="text-xs text-slate-500 mb-3">PAN Card / Aadhaar / Voter ID</p>
                                <input
                                    type="file"
                                    accept="image/*,application/pdf"
                                    onChange={(e) => handleFileChange('idDocumentFront', e)}
                                    className="hidden"
                                    id="doc-upload"
                                />
                                <label
                                    htmlFor="doc-upload"
                                    className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 cursor-pointer hover:bg-slate-50"
                                >
                                    {formData.idDocumentFront ? 'Change File' : 'Select File'}
                                </label>
                                {formData.idDocumentFront && (
                                    <p className="text-xs text-green-600 font-medium mt-2">
                                        Selected: {formData.idDocumentFront.name}
                                    </p>
                                )}
                                {errors.idDocumentFront && <p className="text-xs text-red-500 mt-2">{errors.idDocumentFront}</p>}
                            </div>
                        </div>
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
            </form >
        </div >
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
