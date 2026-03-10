'use client';

/**
 * KYC Multi-Step Wizard Orchestrator
 *
 * 3-step wizard: Identity → PAN Verify → Address
 * Uses existing server actions and validators from app/types/kyc.js.
 *
 * @component
 */

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Lock } from 'lucide-react';
import { toast } from 'react-hot-toast';

import StepProgressBar from '@/components/kyc/steps/StepProgressBar';
import Step1Identity, { validateStep1 } from '@/components/kyc/steps/Step1Identity';
import Step2PAN, { validateStep2 } from '@/components/kyc/steps/Step2PAN';
import Step3Address, { validateStep3 } from '@/components/kyc/steps/Step3Address';
import SuccessScreen from '@/components/kyc/steps/SuccessScreen';

import { submitKYC } from '@/app/actions/kyc';
import { formatDateForInput } from '@/app/types/kyc';

/**
 * Direction for slide animation: +1 = forward, -1 = back.
 * @typedef {1 | -1} SlideDirection
 */

const slideVariants = {
    /** @param {SlideDirection} direction */
    enter: (/** @type {SlideDirection} */ direction) => ({
        x: direction > 0 ? 300 : -300,
        opacity: 0,
    }),
    center: { x: 0, opacity: 1 },
    /** @param {SlideDirection} direction */
    exit: (/** @type {SlideDirection} */ direction) => ({
        x: direction > 0 ? -300 : 300,
        opacity: 0,
    }),
};

/**
 * @typedef {Object} KYCFormProps
 * @property {Object} [initialData] - Pre-fill form data
 * @property {Function} [onSuccess] - Callback after successful submission
 * @property {Function} [onError] - Callback on submission error
 * @property {string} [userType] - Type of user (merchant, customer)
 */

/** @param {KYCFormProps} props */
export default function KYCForm({
    initialData = {},
    onSuccess = null,
    onError = null,
    userType = 'customer',
}) {
    // ─── State ───
    const initDraft = () => {
        if (typeof window === 'undefined') return null;
        try {
            const val = sessionStorage.getItem('kyc_draft');
            return val ? JSON.parse(val) : null;
        } catch (e) {
            return null;
        }
    };

    const draft = initDraft() || {};

    const [currentStep, setCurrentStep] = useState(/** @type {1 | 2 | 3} */(draft.currentStep || 1));
    const [completedSteps, setCompletedSteps] = useState(/** @type {Set<number>} */(new Set(draft.completedSteps || [])));
    const [slideDirection, setSlideDirection] = useState(/** @type {SlideDirection} */(1));

    const [formData, setFormData] = useState(draft.formData || {
        fullName: initialData.fullName || '',
        phoneNumber: initialData.phone || initialData.phoneNumber || '',
        dateOfBirth: initialData.dateOfBirth || '',
        gender: initialData.gender || '',
        panNumber: initialData.panNumber || initialData.panCard || '',
        fatherName: initialData.fatherName || '',
        fullAddress: initialData.address || initialData.fullAddress || '',
        city: initialData.city || '',
        state: initialData.state || '',
        pinCode: initialData.pinCode || '',
        bankGradeSecurity: initialData.bankGradeSecurity || false,
        termsAccepted: false,
    });

    const [fieldLocked, setFieldLocked] = useState(draft.fieldLocked || {
        name: false,
        dob: false,
        fatherName: false,
    });

    const [panVerified, setPanVerified] = useState(draft.panVerified ?? false);
    const [showAutoFillBanner, setShowAutoFillBanner] = useState(draft.showAutoFillBanner ?? false);

    useEffect(() => {
        try {
            sessionStorage.setItem('kyc_draft', JSON.stringify({
                currentStep,
                completedSteps: Array.from(completedSteps),
                formData,
                fieldLocked,
                panVerified,
                showAutoFillBanner
            }));
        } catch (e) {
            // Ignore private browsing restrictions
        }
    }, [formData, currentStep, panVerified, fieldLocked, completedSteps, showAutoFillBanner]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [submissionStatus, setSubmissionStatus] = useState('');

    /** @type {Object<string, string>} */
    const [errors, setErrors] = useState(/** @type {Record<string, string>} */({}));

    // ─── Field change handler ───
    const handleChange = useCallback((/** @type {string} */ field, /** @type {string | boolean} */ value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        // Clear error for this field when user edits
        setErrors((prev) => {
            if (prev[field]) {
                const next = { ...prev };
                delete next[field];
                return next;
            }
            return prev;
        });
    }, []);

    // ─── Unlock a locked field ───
    const handleUnlock = useCallback((/** @type {string} */ field) => {
        setFieldLocked((prev) => ({ ...prev, [field]: false }));
    }, []);

    // ─── PAN verified handler ───
    const handlePANVerified = useCallback(
        (panData, mode = 'verified') => {
            setPanVerified(true);

            if (mode === 'manual_review') {
                setShowAutoFillBanner(false);
                setFieldLocked({ name: false, dob: false, fatherName: false });
                toast.success('PAN recorded. We will manually verify your details.');
            } else {
                setShowAutoFillBanner(true);

                if (panData) {
                    // Auto-fill fields from PAN data
                    setFormData((prev) => ({
                        ...prev,
                        fullName: panData.full_name || prev.fullName,
                        dateOfBirth: panData.dob ? convertDOB(panData.dob) : prev.dateOfBirth,
                        fatherName: panData.father_name || prev.fatherName,
                    }));

                    // Lock auto-filled fields
                    setFieldLocked({
                        name: !!panData.full_name,
                        dob: !!panData.dob,
                        fatherName: !!panData.father_name,
                    });
                }
                toast.success('PAN verified! Details auto-filled.');
            }
        },
        []
    );

    // ─── PAN reset handler (when user edits PAN after verification) ───
    const handlePANReset = useCallback(() => {
        setPanVerified(false);
        setShowAutoFillBanner(false);
        // Unlock and clear PAN-derived fields
        setFieldLocked({ name: false, dob: false, fatherName: false });
        setFormData((prev) => ({
            ...prev,
            fullName: '',
            dateOfBirth: '',
            fatherName: '',
        }));
    }, []);

    // ─── Form draft reset handler (when user wants to clear everything and start over) ───
    const handleFormReset = useCallback(() => {
        try {
            sessionStorage.removeItem('kyc_draft');
        } catch (e) { }

        setCurrentStep(1);
        setCompletedSteps(new Set());
        setSlideDirection(-1);
        setPanVerified(false);
        setShowAutoFillBanner(false);
        setFieldLocked({ name: false, dob: false, fatherName: false });
        setErrors({});

        setFormData({
            fullName: initialData.fullName || '',
            phoneNumber: initialData.phone || initialData.phoneNumber || '',
            dateOfBirth: initialData.dateOfBirth || '',
            gender: initialData.gender || '',
            panNumber: initialData.panNumber || initialData.panCard || '',
            fatherName: initialData.fatherName || '',
            fullAddress: initialData.address || initialData.fullAddress || '',
            city: initialData.city || '',
            state: initialData.state || '',
            pinCode: initialData.pinCode || '',
            bankGradeSecurity: initialData.bankGradeSecurity || false,
            termsAccepted: false,
        });
    }, [initialData]);

    // ─── Step navigation ───
    const goToStep = useCallback(
        (/** @type {1 | 2 | 3} */ step) => {
            setSlideDirection(step > currentStep ? 1 : -1);
            setCurrentStep(step);
            setErrors({}); // Clear cross-step errors on navigation
        },
        [currentStep]
    );

    const handleNext = useCallback(() => {
        let validation;

        if (currentStep === 1) {
            validation = validateStep1(formData);
        } else if (currentStep === 2) {
            validation = validateStep2(formData, panVerified);
        } else {
            return; // Step 3 has submit, not next
        }

        if (!validation.valid) {
            setErrors(validation.errors);
            toast.error('Please fix the errors before continuing');
            return;
        }

        setErrors({});
        setCompletedSteps((prev) => new Set([...prev, currentStep]));
        goToStep(/** @type {1 | 2 | 3} */(Math.min(currentStep + 1, 3)));
    }, [currentStep, formData, panVerified, goToStep]);

    const handleBack = useCallback(() => {
        if (currentStep > 1) {
            goToStep(/** @type {1 | 2 | 3} */(currentStep - 1));
        }
    }, [currentStep, goToStep]);

    // ─── Form submit (Step 3) ───
    const handleSubmit = useCallback(
        async (/** @type {React.FormEvent<HTMLFormElement>} */ e) => {
            e.preventDefault();

            const validation = validateStep3(formData);
            if (!validation.valid) {
                setErrors(validation.errors);
                toast.error('Please fix the errors before submitting');
                return;
            }

            setIsSubmitting(true);
            setErrors({});

            try {
                const submitData = new FormData();
                submitData.append('fullName', formData.fullName);
                submitData.append('phoneNumber', formData.phoneNumber);
                submitData.append('dateOfBirth', formData.dateOfBirth);
                submitData.append('panNumber', formData.panNumber);
                submitData.append('gender', formData.gender);
                submitData.append('fatherName', formData.fatherName);
                submitData.append('fullAddress', formData.fullAddress);
                submitData.append('bankGradeSecurity', String(formData.bankGradeSecurity));
                submitData.append('city', formData.city);
                submitData.append('state', formData.state);
                submitData.append('pinCode', formData.pinCode);

                const result = await submitKYC(submitData);

                if (result.success) {
                    try {
                        sessionStorage.removeItem('kyc_draft');
                    } catch (e) { }
                    setCompletedSteps((prev) => new Set([...prev, 3]));
                    setSubmissionStatus(result.data.verification_status);
                    setShowSuccess(true);
                    if (onSuccess) {
                        onSuccess(result.data);
                    }
                } else {
                    toast.error(result.error || 'Submission failed');
                    if (onError) {
                        onError(result.error);
                    }
                }
            } catch (error) {
                const message = error instanceof Error ? error.message : 'An unexpected error occurred';
                toast.error(message);
                if (onError) {
                    onError(message);
                }
            } finally {
                setIsSubmitting(false);
            }
        },
        [formData, onError]
    );

    // ─── Render ───
    return (
        <>
            <SuccessScreen visible={showSuccess} status={submissionStatus} />

            <div className="w-full max-w-xl mx-auto">
                {/* Progress bar */}
                <StepProgressBar currentStep={currentStep} completedSteps={completedSteps} />

                {/* Form card */}
                <form
                    onSubmit={handleSubmit}
                    className="bg-white shadow-[0_2px_16px_rgba(0,0,0,0.08)] rounded-[16px] p-6 sm:p-8 relative"
                >
                    {/* Skeleton overlay while submitting */}
                    {isSubmitting && (
                        <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-20 flex items-center justify-center">
                            <div className="w-full max-w-xs space-y-4 p-6">
                                <div className="h-4 bg-slate-200 rounded animate-pulse" />
                                <div className="h-4 bg-slate-200 rounded animate-pulse w-3/4" />
                                <div className="h-4 bg-slate-200 rounded animate-pulse w-1/2" />
                            </div>
                        </div>
                    )}

                    {/* Step title */}
                    <div className="mb-8 border-b border-slate-100 pb-5 flex items-start justify-between">
                        <div>
                            <h2 className="text-[22px] font-semibold text-slate-900 tracking-tight">
                                {currentStep === 1 && 'Personal Details'}
                                {currentStep === 2 && 'PAN Verification'}
                                {currentStep === 3 && 'Address & Security'}
                            </h2>
                            <p className="text-slate-500 text-sm mt-1.5 font-medium leading-relaxed">
                                {currentStep === 1 && 'Enter your basic identity information'}
                                {currentStep === 2 && 'Verify your PAN card for instant KYC'}
                                {currentStep === 3 && 'Complete your address and security preferences'}
                            </p>
                        </div>

                        {/* Cancel & Start Over Button */}
                        <button
                            type="button"
                            onClick={handleFormReset}
                            title="Clear all progress and start over"
                            className="text-xs font-semibold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap"
                        >
                            Reset Form
                        </button>
                    </div>

                    {/* Animated step content */}
                    <AnimatePresence mode="wait" custom={slideDirection}>
                        <motion.div
                            key={currentStep}
                            custom={slideDirection}
                            variants={slideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                        >
                            {currentStep === 1 && (
                                <Step1Identity
                                    formData={formData}
                                    onChange={handleChange}
                                    errors={errors}
                                    fieldLocked={fieldLocked}
                                    onUnlock={handleUnlock}
                                />
                            )}

                            {currentStep === 2 && (
                                <Step2PAN
                                    formData={formData}
                                    onChange={handleChange}
                                    errors={errors}
                                    panVerified={panVerified}
                                    showAutoFillBanner={showAutoFillBanner}
                                    onPANVerified={handlePANVerified}
                                    onPANReset={handlePANReset}
                                    fieldLocked={fieldLocked}
                                    onUnlock={handleUnlock}
                                />
                            )}

                            {currentStep === 3 && (
                                <Step3Address
                                    formData={formData}
                                    onChange={handleChange}
                                    errors={errors}
                                    isSubmitting={isSubmitting}
                                />
                            )}
                        </motion.div>
                    </AnimatePresence>

                    {/* Navigation buttons (Steps 1 & 2) */}
                    {currentStep < 3 && (
                        <div className="sticky bottom-0 z-30 bg-white border-t border-slate-100 flex flex-col gap-4 mt-8 -mx-6 -mb-6 px-6 py-4 pb-6 sm:-mx-8 sm:-mb-8 sm:px-8 sm:py-6 sm:pb-6 rounded-b-[16px] shadow-[0_-4px_16px_rgba(0,0,0,0.03)]">
                            <div className="flex items-center justify-between gap-4 w-full">
                                {currentStep > 1 ? (
                                    <button
                                        type="button"
                                        onClick={handleBack}
                                        className="flex items-center justify-center gap-2 px-6 py-3.5 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl border-1.5 border-slate-200 transition-colors text-[15px] font-semibold flex-1 sm:flex-none sm:w-1/3"
                                    >
                                        <ArrowLeft size={18} />
                                        Back
                                    </button>
                                ) : null}

                                <button
                                    type="button"
                                    onClick={handleNext}
                                    className="flex items-center justify-center gap-2 px-6 py-3.5 bg-[#1A56DB] hover:bg-[#1546b5] text-white rounded-xl shadow-[0_4px_12px_rgba(26,86,219,0.25)] transition-all text-[15px] font-semibold flex-1"
                                >
                                    Continue
                                    <ArrowRight size={18} />
                                </button>
                            </div>

                            {/* Help text */}
                            <div className="flex items-center justify-center gap-1.5 pt-2">
                                <Lock size={12} className="text-slate-400" />
                                <p className="text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
                                    Your information is encrypted and secure
                                </p>
                            </div>
                        </div>
                    )}
                </form>
            </div>
        </>
    );
}

// ─── Helpers ───

/**
 * Converts DD/MM/YYYY (from SprintVerify) to YYYY-MM-DD (HTML date input).
 * Falls back to formatDateForInput which handles DD-MM-YYYY.
 *
 * @param {string} dob - Date string from PAN API (e.g. "01/01/1990")
 * @returns {string} YYYY-MM-DD formatted date
 */
function convertDOB(dob) {
    if (!dob) return '';

    // Handle DD/MM/YYYY format
    if (dob.includes('/')) {
        const [day, month, year] = dob.split('/');
        if (day && month && year) return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    // Handle DD-MM-YYYY format (via formatDateForInput)
    if (dob.includes('-') && dob.indexOf('-') === 2) {
        return formatDateForInput(dob);
    }

    // Already YYYY-MM-DD
    return dob;
}
