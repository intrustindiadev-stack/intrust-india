'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    Building2, FileText, CheckCircle, ArrowRight, Shield,
    Loader2, Store, TrendingUp, Users, Check, CreditCard, Banknote, X, Home, Share2, Info, AlertCircle, CheckCircle2,
    Lock, BadgeCheck, ChevronDown, ChevronLeft, MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/contexts/AuthContext';
import { createClient } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { verifyGSTIN } from '@/app/actions/sprintVerifyActions';
import MerchantApplyShowcase from '@/components/merchant/MerchantApplyShowcase';
import { MERCHANT_DEPARTMENTS } from '@/lib/constants/departments';
import { useForm } from 'react-hook-form';

const DRAFT_STORAGE_KEY = 'intrust_merchant_apply_draft';

const DEFAULT_FORM_VALUES = {
    businessName: '',
    gstNumber: '',
    ownerName: '',
    phone: '',
    email: '',
    address: '',
    pincode: '',
    bankAccount: '',
    bankAccountName: '',
    bankName: '',
    ifscCode: '',
    confirmBankAccount: '',
    panCard: '',
    merchantReferralCode: '',
    department: 'grocery',
};

// Wizard definition — progressive disclosure keeps mobile drop-offs low
const WIZARD_STEPS = [
    { n: 1, label: 'Profile' },
    { n: 2, label: 'Contact' },
    { n: 3, label: 'Bank' },
];

// Which fields belong to which wizard step (used to reveal validation errors)
const STEP_TOUCH_KEYS = {
    1: ['businessName', 'gstNumber', 'ownerName', 'panCard'],
    2: ['phone', 'email', 'address', 'pincode', 'merchantReferralCode'],
    3: ['bankAccountName', 'bankAccount', 'confirmBankAccount', 'ifscCode', 'bankName'],
};

// Confetti pieces are generated once at module scope (outside render) to keep
// the component pure — Math.random() must not run during render (react-hooks/purity).
const CONFETTI_COLORS = ['#2563EB', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];
const CONFETTI_PIECES = Array.from({ length: 50 }, () => ({
    left: Math.random() * 100 + '%',
    rotateTo: Math.random() * 360,
    duration: Math.random() * 2 + 2,
    delay: Math.random() * 0.5,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
}));

// Confetti Component
const Confetti = () => {
    return (
        <div className="fixed inset-0 pointer-events-none overflow-hidden select-none z-50">
            {CONFETTI_PIECES.map((piece, i) => (
                <motion.div
                    key={i}
                    initial={{
                        top: -20,
                        left: piece.left,
                        scale: 0,
                    }}
                    animate={{
                        top: "100%",
                        scale: [0, 1, 0.5],
                        rotate: piece.rotateTo,
                    }}
                    transition={{
                        duration: piece.duration,
                        delay: piece.delay,
                        ease: "linear",
                        repeat: 0
                    }}
                    className="absolute w-3 h-3 rounded-full"
                    style={{ backgroundColor: piece.color }}
                />
            ))}
        </div>
    );
};

export default function MerchantApplyPage() {
    return (
        <Suspense fallback={
            <div className="h-screen w-full flex items-center justify-center bg-white dark:bg-[#020617] transition-colors">
                <Loader2 className="animate-spin text-[#D4AF37]" size={32} />
            </div>
        }>
            <MerchantApplyPageInner />
        </Suspense>
    );
}

function MerchantApplyPageInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, profile, loading: authLoading, refreshProfile } = useAuth();
    const supabase = createClient();
    const [showIntro, setShowIntro] = useState(true);
    // 3-step wizard: 1 Business Profile · 2 Contact & Location · 3 Settlements (4 = Success)
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [checkingStatus, setCheckingStatus] = useState(true);
    const [isMounted, setIsMounted] = useState(false);

    // react-hook-form instance for state tracking & draft persistence
    const { watch, reset, setValue, getValues } = useForm({
        defaultValues: DEFAULT_FORM_VALUES,
    });

    // Verification States
    const [verifying, setVerifying] = useState({ gstin: false });
    const [verified, setVerified] = useState({ gstin: null }); // null, 'verified', 'pending', 'failed'
    const [successStatus, setSuccessStatus] = useState('approved');

    // Form State (kept in sync with useForm)
    const [formData, setFormData] = useState(DEFAULT_FORM_VALUES);

    // Task 1: Form Hydration (Load Draft on client mount)
    useEffect(() => {
        setIsMounted(true);
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
                if (savedDraft) {
                    const parsedData = JSON.parse(savedDraft);
                    if (parsedData && typeof parsedData === 'object' && !Array.isArray(parsedData)) {
                        const sanitizedDraft = { ...DEFAULT_FORM_VALUES };
                        for (const key of Object.keys(DEFAULT_FORM_VALUES)) {
                            if (parsedData[key] !== undefined && parsedData[key] !== null) {
                                sanitizedDraft[key] = String(parsedData[key]);
                            }
                        }
                        reset(sanitizedDraft);
                        setFormData(sanitizedDraft);

                        const hasEnteredData = Object.entries(sanitizedDraft).some(([k, v]) => {
                            if (k === 'department') return false;
                            return v && typeof v === 'string' && v.trim().length > 0;
                        });
                        if (hasEnteredData) {
                            setShowIntro(false);
                        }
                    }
                }
            }
        } catch (err) {
            console.error('Failed to load merchant apply draft from localStorage:', err);
        }
    }, [reset]);

    // Task 2: Continuous Auto-Save with watch subscription & debounce
    useEffect(() => {
        if (!isMounted) return;

        let debounceTimer;
        const subscription = watch((value) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                try {
                    if (typeof window !== 'undefined' && window.localStorage) {
                        const hasContent = Object.entries(value).some(([k, v]) => {
                            if (k === 'department') return v && v !== 'grocery';
                            return v && typeof v === 'string' && v.trim().length > 0;
                        });

                        if (hasContent) {
                            localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(value));
                        }
                    }
                } catch (saveErr) {
                    console.error('Failed to auto-save merchant apply draft:', saveErr);
                }
            }, 300); // 300ms debounce
        });

        // Also ensure draft is saved on beforeunload
        const handleBeforeUnload = () => {
            try {
                const currentVals = getValues();
                if (typeof window !== 'undefined' && window.localStorage && currentVals) {
                    const hasContent = Object.entries(currentVals).some(([k, v]) => {
                        if (k === 'department') return v && v !== 'grocery';
                        return v && typeof v === 'string' && v.trim().length > 0;
                    });
                    if (hasContent) {
                        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(currentVals));
                    }
                }
            } catch (_) {}
        };
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            clearTimeout(debounceTimer);
            subscription.unsubscribe();
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [watch, isMounted, getValues]);

    // Check if user already applied
    useEffect(() => {
        const checkMerchantStatus = async () => {
            if (user) {
                const { data } = await supabase
                    .from('merchants')
                    .select('id')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (data) {
                    // Already applied, redirect to dashboard (layout will route to pending if needed)
                    router.replace('/merchant/dashboard');
                    return;
                }
            }
            setCheckingStatus(false);
        };

        if (!authLoading) {
            if (!user) {
                // Not logged in — send to login with redirect-back param
                router.replace('/login?redirect=/merchant-apply');
            } else {
                checkMerchantStatus();
            }
        }
    }, [user, authLoading, router, supabase]);

    // Auto-fill referral code from URL
    useEffect(() => {
        const ref = searchParams.get('ref');
        if (ref) {
            const cleanRef = ref.toUpperCase().trim();
            setValue('merchantReferralCode', cleanRef, { shouldDirty: true });
            setFormData(prev => ({
                ...prev,
                merchantReferralCode: cleanRef
            }));
        }
    }, [searchParams, setValue]);

    const [touched, setTouched] = useState({});
    const markTouched = (k) => setTouched(p => ({ ...p, [k]: true }));
    const markStepTouched = (stepNumber) => {
        const keys = STEP_TOUCH_KEYS[stepNumber] || [];
        setTouched(prev => ({ ...prev, ...Object.fromEntries(keys.map(k => [k, true])) }));
    };

    const handleFieldChange = (key, value) => {
        setValue(key, value, { shouldDirty: true, shouldTouch: true });
        setFormData(prev => ({ ...prev, [key]: value }));
        if (touched[key]) {
            markTouched(key);
        }
    };

    const hasAnyBankField = Boolean(
        (formData.bankAccountName || '').trim() ||
        (formData.bankAccount || '').trim() ||
        (formData.confirmBankAccount || '').trim() ||
        (formData.ifscCode || '').trim() ||
        (formData.bankName || '').trim()
    );

    const isBusinessNameValid = (formData.businessName || '').trim().length >= 3;
    const isOwnerNameValid = (formData.ownerName || '').trim().length >= 3;
    const isPhoneValid = /^[6-9]\d{9}$/.test((formData.phone || '').trim());
    const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((formData.email || '').trim());
    const isAddressValid = (formData.address || '').trim().length >= 10;
    const isGstValid = !(formData.gstNumber || '').trim() || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test((formData.gstNumber || '').trim());
    const isReferralValid = !(formData.merchantReferralCode || '').trim() || /^[A-Z0-9]{6}$/.test((formData.merchantReferralCode || '').trim().toUpperCase());
    const isPincodeValid = /^[1-9][0-9]{5}$/.test((formData.pincode || '').trim());

    const isBankAccountNameValid = (formData.bankAccountName || '').trim().length >= 3;
    const isBankAccountValid = /^[0-9]{9,18}$/.test((formData.bankAccount || '').trim());
    const isConfirmAccountValid = Boolean((formData.confirmBankAccount || '').trim()) && formData.confirmBankAccount === formData.bankAccount;
    const isIfscValid = /^[A-Z]{4}0[A-Z0-9]{6}$/.test((formData.ifscCode || '').trim().toUpperCase());
    const isBankNameValid = true;
    const isPanValid = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test((formData.panCard || '').trim().toUpperCase());

    const bankFieldKeys = ['bankAccountName', 'bankAccount', 'confirmBankAccount', 'ifscCode', 'bankName'];

    const getFieldState = (key, value, isValid) => {
        if (bankFieldKeys.includes(key)) {
            if (!hasAnyBankField) return 'idle';
            if (!touched[key]) return 'idle';
            if (key === 'bankName') {
                return (value || '').trim() ? 'valid' : 'idle';
            }
            return isValid ? 'valid' : 'invalid';
        }

        if (!touched[key]) return 'idle';

        if (key === 'gstNumber' && !(value || '').trim()) {
            return 'idle';
        }
        if (key === 'merchantReferralCode' && !(value || '').trim()) {
            return 'idle';
        }

        return isValid ? 'valid' : 'invalid';
    };

    const [error, setError] = useState('');

    const handleVerifyGSTIN = async () => {
        if (!formData.gstNumber) {
            toast.error("Please enter a GSTIN first");
            return;
        }

        const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        if (!gstinRegex.test(formData.gstNumber)) {
            toast.error("Invalid GSTIN format.");
            return;
        }

        setVerifying(prev => ({ ...prev, gstin: true }));
        try {
            const result = await verifyGSTIN(formData.gstNumber);
            if (result.valid === true) {
                const businessName = result.data?.legal_name || '';
                const address = `${result.data?.prb?.addr?.bno || ''} ${result.data?.prb?.addr?.st || ''} ${result.data?.prb?.addr?.loc || ''} ${result.data?.prb?.addr?.pncd || ''}`.trim();

                toast.success('GSTIN Verified Successfully!');
                setVerified(prev => ({ ...prev, gstin: 'verified' }));

                // Auto-fill form if empty
                const updatedBusinessName = formData.businessName || businessName;
                const updatedAddress = formData.address || address;

                if (!formData.businessName && businessName) {
                    setValue('businessName', businessName, { shouldDirty: true });
                }
                if (!formData.address && address) {
                    setValue('address', address, { shouldDirty: true });
                }

                setFormData(prev => ({
                    ...prev,
                    businessName: updatedBusinessName,
                    address: updatedAddress
                }));
            } else if (result.valid === 'manual_review') {
                toast(result.message || 'GSTIN service degraded, manual review will be performed', { icon: '⚠️' });
                setVerified(prev => ({ ...prev, gstin: 'pending' }));
            } else {
                toast.error(result.message || 'GSTIN verification failed');
                setVerified(prev => ({ ...prev, gstin: 'failed' }));
            }
        } catch (err) {
            console.error(err);
            toast.error('Failed to connect to verification service');
        } finally {
            setVerifying(prev => ({ ...prev, gstin: false }));
        }
    };

    const handleFormSubmit = async (e) => {
        if (e && e.preventDefault) e.preventDefault();

        // Final gate — re-validate every wizard step before hitting the API
        const step1Error = validateStep1();
        if (step1Error) {
            toast.error(step1Error);
            setError(step1Error);
            markStepTouched(1);
            setCurrentStep(1);
            return;
        }
        const step2Error = validateStep2();
        if (step2Error) {
            toast.error(step2Error);
            setError(step2Error);
            markStepTouched(2);
            setCurrentStep(2);
            return;
        }
        const step3Error = validateStep3();
        if (step3Error) {
            toast.error(step3Error);
            setError(step3Error);
            markStepTouched(3);
            return;
        }

        setLoading(true);
        setError('');

        try {
            // Call API to create merchant account
            const response = await fetch('/api/merchant/apply', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to submit application');
            }

            // Success! Merchant account created
            console.log('✅ Merchant account created:', data);

            // Task 3: Draft Cleanup (Garbage Collection)
            // Immediately upon successful submission, remove draft from localStorage
            try {
                if (typeof window !== 'undefined' && window.localStorage) {
                    localStorage.removeItem(DRAFT_STORAGE_KEY);
                }
            } catch (storageErr) {
                console.warn('Could not remove merchant apply draft from localStorage:', storageErr);
            }

            // Reset useForm and state to clean slate
            reset(DEFAULT_FORM_VALUES);
            setFormData(DEFAULT_FORM_VALUES);

            // Success step will handle status-specific message
            setSuccessStatus(data.status || 'approved');

            if (refreshProfile) await refreshProfile();
            setLoading(false);
            setCurrentStep(4); // Move to Success Step
        } catch (err) {
            console.error('❌ Error submitting merchant application:', err);
            setError(err.message || 'Failed to submit application. Please try again.');
            setLoading(false);
        }
    };

    // ---- Step 1: Business Profile (store name, category, GST, PAN) ----
    const validateStep1 = () => {
        if (!formData.businessName.trim()) return "Business Name is required";

        // GSTIN Validation (Optional, but if filled must be valid)
        if (formData.gstNumber) {
            const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
            if (!gstinRegex.test(formData.gstNumber)) return "Invalid GSTIN format (e.g., 22AAAAA0000A1Z5)";
        }

        if (!formData.ownerName.trim()) return "Owner Name is required";

        if (!formData.panCard) return "Please enter your PAN Number.";

        const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
        if (!panRegex.test(formData.panCard.trim().toUpperCase())) return "Invalid PAN format (e.g., ABCDE1234F)";

        return null;
    };

    // ---- Step 2: Contact & Location (phone, email, address, pincode, referral) ----
    const validateStep2 = () => {
        // Mobile Validation (10 digits, starts with 6-9)
        const mobileRegex = /^[6-9]\d{9}$/;
        if (!mobileRegex.test((formData.phone || '').trim())) return "Invalid Mobile Number (must be 10 digits starting with 6-9)";

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test((formData.email || '').trim())) return "Invalid Email Address";

        if (!(formData.address || '').trim()) return "Address is required";
        if ((formData.address || '').trim().length < 10) return "Address must be at least 10 characters";

        // Pincode Validation (6-digit Indian pincode, cannot start with 0)
        const pincodeRegex = /^[1-9][0-9]{5}$/;
        if (!pincodeRegex.test((formData.pincode || '').trim())) return "Invalid Pincode (must be a valid 6-digit pincode)";

        // Referral is optional — but must be well-formed if provided
        if ((formData.merchantReferralCode || '').trim() && !isReferralValid) return "Referral code must be 6 alphanumeric characters";

        return null;
    };

    // ---- Step 3: Settlements (bank details are fully optional) ----
    const validateStep3 = () => {
        const accHolderName = (formData.bankAccountName || '').trim();
        const accNum = (formData.bankAccount || '').trim();
        const confirmAccNum = (formData.confirmBankAccount || '').trim();
        const ifsc = (formData.ifscCode || '').trim().toUpperCase();
        const bankName = (formData.bankName || '').trim();

        const hasAnyBankFieldLocal = Boolean(accHolderName || accNum || confirmAccNum || ifsc || bankName);

        if (!hasAnyBankFieldLocal) {
            return null;
        }

        if (!accHolderName) return "Please enter the Account Holder Name.";

        if (!accNum || !ifsc) return "Please enter your Bank Account details.";

        if (formData.bankAccount !== formData.confirmBankAccount) return "Account numbers do not match.";

        const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
        if (!ifscRegex.test(ifsc)) return "Invalid IFSC format (e.g., SBIN0000001).";

        return null;
    };

    const nextStep = () => {
        let errorMsg = null;
        if (currentStep === 1) errorMsg = validateStep1();
        else if (currentStep === 2) errorMsg = validateStep2();

        if (errorMsg) {
            toast.error(errorMsg);
            setError(errorMsg);
            markStepTouched(currentStep);
            return;
        }
        setError('');
        setCurrentStep(Math.min(currentStep + 1, 3));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const prevStep = () => {
        setError('');
        setCurrentStep(Math.max(currentStep - 1, 1));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Allow jumping back to an already-completed step from the stepper
    const goToStep = (target) => {
        if (typeof target !== 'number' || target >= currentStep) return;
        setError('');
        setCurrentStep(target);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Show blank page while auth is loading or checking merchant status or before client mount to avoid flashing / SSR mismatch
    if (authLoading || checkingStatus || !isMounted) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-white dark:bg-[#020617] transition-colors">
                <Loader2 className="animate-spin text-[#D4AF37]" size={32} />
            </div>
        );
    }

    if (profile && profile.kyc_status !== 'verified') {
        const isPending = profile.kyc_status === 'pending';
        const isRejected = profile.kyc_status === 'rejected';

        return (
            <div className="h-screen w-full bg-white dark:bg-[#020617] font-[family-name:var(--font-outfit)] overflow-hidden relative flex flex-col md:flex-row transition-colors">
                {/* Desktop: Left Side Brand Panel (Hidden on Mobile) */}
                <div className="hidden md:flex w-1/2 lg:w-[45%] bg-slate-900 dark:bg-[#0F1419] h-full relative overflow-hidden flex-col justify-between p-12 text-white transition-colors">
                    <div className="absolute inset-0 opacity-20">
                        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500 rounded-full blur-[100px] animate-pulse-slow" />
                        <div className="absolute top-1/2 -left-24 w-72 h-72 bg-[#D4AF37] rounded-full blur-[100px] animate-pulse-slow delay-700" />
                        <div className="absolute -bottom-24 right-24 w-80 h-80 bg-emerald-500 rounded-full blur-[100px]" />
                    </div>

                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-8">
                            <div className="w-10 h-10 bg-[#D4AF37] rounded-xl flex items-center justify-center text-slate-900 font-bold text-xl">I</div>
                            <span className="text-2xl font-bold tracking-tight">INTRUST</span>
                        </div>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <h1 className="text-5xl font-extrabold leading-tight mb-6">
                                Grow your business <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-[#D4AF37]">exponentially.</span>
                            </h1>
                            <p className="text-slate-400 text-lg max-w-md">
                                Join 2,400+ merchants who are already selling gift cards to millions of customers.
                            </p>
                        </motion.div>
                    </div>

                    <div className="relative z-10 space-y-6">
                        <TrustItem icon={Users} title="Millions of Customers" text="Access our verified user base instantly." delay={0.4} />
                        <TrustItem icon={Shield} title="Zero Fraud Liability" text="We cover 100% of chargeback risks." delay={0.5} />
                        <TrustItem icon={Banknote} title="Instant Settlements" text="Get paid directly to your bank account." delay={0.6} />
                    </div>

                    <div className="relative z-10 text-[10px] text-slate-500 font-bold tracking-widest uppercase">
                        © 2024 Intrust Platform
                    </div>
                </div>

                {/* Right Panel: KYC Gate */}
                <div className="flex-1 h-full relative flex items-center justify-center p-6 bg-white dark:bg-[#020617] transition-colors">
                    <div className="max-w-[480px] w-full text-center">
                        <div className="w-20 h-20 bg-amber-50 dark:bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Shield className="w-10 h-10 text-[#D4AF37]" />
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-4">Complete KYC Before Applying</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-lg mb-8">
                            You need to verify your identity (KYC) before you can apply to become a merchant on Intrust.
                        </p>

                        <div className={`p-4 rounded-xl text-left mb-8 font-medium shadow-sm border ${isPending ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20' :
                                isRejected ? 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20' :
                                    'bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-slate-300 border-black/5 dark:border-white/10'
                            }`}>
                            {isPending ? "Your KYC is under review. You'll be able to apply once it's approved." :
                                isRejected ? "Your KYC was rejected. Please resubmit with correct details." :
                                    "Complete your KYC verification — it takes less than 2 minutes."}
                        </div>

                        <div className="space-y-4">
                            <button
                                onClick={() => router.push('/profile/kyc')}
                                className="w-full py-4 bg-[#D4AF37] hover:bg-opacity-90 text-[#020617] font-black rounded-2xl shadow-lg shadow-[#D4AF37]/20 transition-all text-lg gold-glow"
                            >
                                {isPending ? "View KYC Status" : "Complete KYC"}
                            </button>
                            <button
                                onClick={() => router.back()}
                                className="w-full py-4 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 font-bold rounded-2xl transition-all"
                            >
                                ← Go Back
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            {/* Cinematic intro — shown before form */}
            <AnimatePresence>
                {showIntro && (
                    <MerchantApplyShowcase onStart={() => setShowIntro(false)} />
                )}
            </AnimatePresence>

            {/* Main form — slides in after intro */}
            <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={showIntro ? { opacity: 0, y: 40 } : { opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="min-h-screen w-full bg-slate-50 dark:bg-[#020617] font-[family-name:var(--font-outfit)] overflow-x-hidden transition-colors"
            >
                {currentStep === 4 && <Confetti />}

                {/* Constrained enterprise layout: 4xl on desktop, full-width mobile */}
                <div className="w-full max-w-4xl mx-auto px-4 py-6 md:py-10">

                    {/* Mobile Brand Header */}
                    <div className="md:hidden flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2">
                            <div className="w-9 h-9 bg-[#D4AF37] rounded-xl flex items-center justify-center text-slate-900 font-bold text-lg">I</div>
                            <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">INTRUST</span>
                        </div>
                        <button
                            onClick={() => router.back()}
                            aria-label="Close application"
                            className="w-11 h-11 min-h-[44px] rounded-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-500 dark:text-slate-400 transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <div className="md:grid md:grid-cols-[250px_1fr] lg:grid-cols-[280px_1fr] md:gap-8 md:items-start">

                        {/* Desktop Side Panel — Branding, Trust Badges & Merchant Benefits */}
                        <aside className="hidden md:block md:sticky md:top-10">
                            <div className="flex items-center gap-2 mb-6">
                                <div className="w-10 h-10 bg-[#D4AF37] rounded-xl flex items-center justify-center text-slate-900 font-bold text-xl">I</div>
                                <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">INTRUST</span>
                            </div>

                            <h1 className="text-2xl font-extrabold leading-snug text-slate-900 dark:text-white mb-2">
                                Become an <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-[#D4AF37]">InTrust Merchant</span>
                            </h1>
                            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                                Join 2,400+ merchants selling to millions of customers across India. Takes under 5 minutes.
                            </p>

                            <div className="space-y-3">
                                <TrustBadge icon={Shield} title="Secure Onboarding" text="Every application is manually reviewed by our trust team." />
                                <TrustBadge icon={Lock} title="Bank-Grade Encryption" text="Your data is protected with 256-bit SSL encryption." />
                                <TrustBadge icon={BadgeCheck} title="Verified Payouts" text="₹1 bank verification before your first settlement." />
                            </div>

                            <div className="mt-6 p-4 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10">
                                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Merchant Benefits</p>
                                <ul className="space-y-2.5">
                                    {['Zero gateway fees on UPI & gift cards', 'Sell across India with instant tracking', 'Dedicated merchant support', 'Flexible settlements — add bank later'].map((benefit) => (
                                        <li key={benefit} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300 font-medium">
                                            <Check size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                                            {benefit}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <p className="mt-6 text-[10px] text-slate-400 font-bold tracking-widest uppercase">© 2026 Intrust India</p>
                        </aside>

                        {/* Wizard Column */}
                        <main className="w-full">

                            {/* Mobile Compact Trust Strip */}
                            <div className="md:hidden flex items-center flex-wrap gap-2 mb-5">
                                {[
                                    { icon: Shield, label: 'Secure Onboarding' },
                                    { icon: Lock, label: '256-bit Encryption' },
                                    { icon: BadgeCheck, label: 'Bank-Grade' },
                                ].map(chip => (
                                    <span key={chip.label} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-600 dark:text-slate-300">
                                        <chip.icon size={13} className="text-indigo-600 dark:text-indigo-400" />
                                        {chip.label}
                                    </span>
                                ))}
                            </div>

                            {/* Visual Stepper — 1. Profile → 2. Contact → 3. Bank */}
                            {currentStep < 4 && (
                                <WizardStepper currentStep={currentStep} onStepClick={goToStep} />
                            )}

                            {/* Form Card — pb-24 keeps the last input clear of the sticky mobile action bar */}
                            <div className={`bg-white dark:bg-[#0b1120] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm p-5 sm:p-8 ${currentStep < 4 ? 'pb-24 md:pb-8' : ''}`}>
                                <AnimatePresence mode="wait">

                                    {/* ============ STEP 1: BUSINESS PROFILE ============ */}
                                    {currentStep === 1 && (
                                        <motion.div
                                            key="step1"
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            transition={{ duration: 0.3 }}
                                            className="py-1"
                                        >
                                            <div className="mb-6">
                                                <p className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-1.5">Step 1 of 3</p>
                                                <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">Business Profile</h2>
                                                <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 font-medium mt-1.5">Tell us about your store to get started.</p>
                                                {profile?.kyc_status === 'verified' && (
                                                    <div className="inline-flex max-w-fit items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-xs font-bold border border-emerald-200 dark:border-emerald-500/30 mt-3">
                                                        <CheckCircle size={14} /> KYC Verified — Identity Confirmed
                                                    </div>
                                                )}
                                            </div>

                                            <div className="space-y-5">
                                                <SmoothInput
                                                    label="Store / Business Name"
                                                    required
                                                    value={formData.businessName}
                                                    onChange={e => handleFieldChange('businessName', e.target.value)}
                                                    onBlur={() => markTouched('businessName')}
                                                    state={getFieldState('businessName', formData.businessName, isBusinessNameValid)}
                                                    hint="Business name must be at least 3 characters"
                                                    icon={Store}
                                                />
                                                <SmoothSelect
                                                    label="Business Category"
                                                    required
                                                    icon={Building2}
                                                    value={formData.department || 'grocery'}
                                                    onChange={e => handleFieldChange('department', e.target.value)}
                                                    options={MERCHANT_DEPARTMENTS.map(dept => ({ value: dept.key, label: `${dept.label} (${dept.badge})` }))}
                                                />
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                                    <SmoothInput
                                                        label="GSTIN (Optional)"
                                                        value={formData.gstNumber}
                                                        onChange={e => {
                                                            handleFieldChange('gstNumber', e.target.value);
                                                            if (verified.gstin) setVerified(prev => ({ ...prev, gstin: null }));
                                                        }}
                                                        onBlur={() => markTouched('gstNumber')}
                                                        state={getFieldState('gstNumber', formData.gstNumber, isGstValid)}
                                                        hint="Invalid GSTIN format (e.g., 22AAAAA0000A1Z5)"
                                                        icon={FileText}
                                                        actionLabel="Verify"
                                                        onAction={handleVerifyGSTIN}
                                                        isVerifying={verifying.gstin}
                                                        verificationState={verified.gstin}
                                                    />
                                                    <SmoothInput
                                                        label="PAN Number"
                                                        required
                                                        value={formData.panCard}
                                                        onChange={e => handleFieldChange('panCard', e.target.value.toUpperCase())}
                                                        onBlur={() => markTouched('panCard')}
                                                        state={getFieldState('panCard', formData.panCard, isPanValid)}
                                                        hint="Enter a valid 10-character PAN (e.g. ABCDE1234F)"
                                                        icon={FileText}
                                                    />
                                                </div>
                                                <SmoothInput
                                                    label="Owner Name"
                                                    required
                                                    value={formData.ownerName}
                                                    onChange={e => handleFieldChange('ownerName', e.target.value)}
                                                    onBlur={() => markTouched('ownerName')}
                                                    state={getFieldState('ownerName', formData.ownerName, isOwnerNameValid)}
                                                    hint="Owner name must be at least 3 characters"
                                                    icon={Users}
                                                />
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* ============ STEP 2: CONTACT & LOCATION ============ */}
                                    {currentStep === 2 && (
                                        <motion.div
                                            key="step2"
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            transition={{ duration: 0.3 }}
                                            className="py-1"
                                        >
                                            <div className="mb-6">
                                                <p className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-1.5">Step 2 of 3</p>
                                                <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">Contact &amp; Location</h2>
                                                <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 font-medium mt-1.5">Where can we reach you, and where is your store?</p>
                                            </div>

                                            <div className="space-y-5">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                                    <SmoothInput
                                                        label="Mobile Number"
                                                        required
                                                        type="tel"
                                                        inputMode="numeric"
                                                        maxLength={10}
                                                        value={formData.phone}
                                                        onChange={e => handleFieldChange('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                                                        onBlur={() => markTouched('phone')}
                                                        state={getFieldState('phone', formData.phone, isPhoneValid)}
                                                        hint="Enter a valid 10-digit mobile number starting with 6-9"
                                                        icon={TrendingUp}
                                                    />
                                                    <SmoothInput
                                                        label="Email Address"
                                                        required
                                                        type="email"
                                                        value={formData.email}
                                                        onChange={e => handleFieldChange('email', e.target.value)}
                                                        onBlur={() => markTouched('email')}
                                                        state={getFieldState('email', formData.email, isEmailValid)}
                                                        hint="Enter a valid email address"
                                                        icon={Building2}
                                                    />
                                                </div>
                                                <SmoothTextArea
                                                    label="Registered Address"
                                                    required
                                                    value={formData.address}
                                                    onChange={e => handleFieldChange('address', e.target.value)}
                                                    onBlur={() => markTouched('address')}
                                                    state={getFieldState('address', formData.address, isAddressValid)}
                                                    hint="Address must be at least 10 characters"
                                                />
                                                <SmoothInput
                                                    label="Pincode"
                                                    required
                                                    inputMode="numeric"
                                                    maxLength={6}
                                                    value={formData.pincode}
                                                    onChange={e => handleFieldChange('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                                                    onBlur={() => markTouched('pincode')}
                                                    state={getFieldState('pincode', formData.pincode, isPincodeValid)}
                                                    hint="Enter a valid 6-digit pincode (e.g. 400001)"
                                                    icon={MapPin}
                                                />
                                                <SmoothInput
                                                    label="Referral Code (Optional)"
                                                    value={formData.merchantReferralCode}
                                                    onChange={e => handleFieldChange('merchantReferralCode', e.target.value.toUpperCase())}
                                                    onBlur={() => markTouched('merchantReferralCode')}
                                                    state={getFieldState('merchantReferralCode', formData.merchantReferralCode, isReferralValid)}
                                                    hint="Referral code must be 6 alphanumeric characters"
                                                    icon={Share2}
                                                />
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* ============ STEP 3: SETTLEMENTS (OPTIONAL) ============ */}
                                    {currentStep === 3 && (
                                        <motion.div
                                            key="step3"
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            transition={{ duration: 0.3 }}
                                            className="py-1"
                                        >
                                            <div className="mb-6">
                                                <p className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-1.5">Step 3 of 3</p>
                                                <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">Settlements</h2>
                                                <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 font-medium mt-1.5">Connect your bank account for settlements — or skip and add it later.</p>
                                            </div>

                                            <div className="space-y-5">
                                                {/* Optional banner — bank details are not required to apply */}
                                                <div className="flex gap-3 items-start p-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20">
                                                    <Info size={18} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                                                    <div>
                                                        <p className="font-bold text-blue-900 dark:text-blue-100 text-sm">Bank details are optional</p>
                                                        <p className="text-blue-700/80 dark:text-blue-300/70 text-sm mt-1 leading-relaxed font-medium">Optional: Skip for now. You can securely add your banking and settlement details later from your Merchant Dashboard once your account is approved.</p>
                                                    </div>
                                                </div>

                                                <div className="p-4 bg-blue-500/5 rounded-xl border border-blue-500/10 dark:border-blue-500/20 flex gap-4 items-start">
                                                    <div className="bg-blue-500/10 p-2 rounded-full text-blue-600 dark:text-blue-400 shrink-0">
                                                        <Shield size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-blue-900 dark:text-blue-100 text-sm">Secure Verification</p>
                                                        <p className="text-blue-700/80 dark:text-blue-300/60 text-sm mt-1.5 leading-relaxed font-medium">We will deposit ₹1 to verify this account automatically. Your banking details are encrypted with 256-bit SSL.</p>
                                                    </div>
                                                </div>

                                                <SmoothInput
                                                    label="Account Holder Name (Optional)"
                                                    type="text"
                                                    value={formData.bankAccountName}
                                                    onChange={e => handleFieldChange('bankAccountName', e.target.value)}
                                                    onBlur={() => markTouched('bankAccountName')}
                                                    state={getFieldState('bankAccountName', formData.bankAccountName, isBankAccountNameValid)}
                                                    hint="Account holder name must be at least 3 characters"
                                                    icon={Users}
                                                />
                                                <SmoothInput
                                                    label="Account Number (Optional)"
                                                    type="text"
                                                    inputMode="numeric"
                                                    pattern="[0-9]*"
                                                    value={formData.bankAccount}
                                                    onChange={e => handleFieldChange('bankAccount', e.target.value)}
                                                    onBlur={() => markTouched('bankAccount')}
                                                    state={getFieldState('bankAccount', formData.bankAccount, isBankAccountValid)}
                                                    hint="Enter a valid bank account number (9-18 digits)"
                                                    icon={CreditCard}
                                                />
                                                <SmoothInput
                                                    label="Confirm Account Number (Optional)"
                                                    type="text"
                                                    inputMode="numeric"
                                                    pattern="[0-9]*"
                                                    value={formData.confirmBankAccount}
                                                    onChange={e => handleFieldChange('confirmBankAccount', e.target.value)}
                                                    onBlur={() => markTouched('confirmBankAccount')}
                                                    state={getFieldState('confirmBankAccount', formData.confirmBankAccount, isConfirmAccountValid)}
                                                    hint="Account numbers do not match"
                                                    icon={CreditCard}
                                                />
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                                    <SmoothInput
                                                        label="IFSC Code (Optional)"
                                                        value={formData.ifscCode}
                                                        onChange={e => handleFieldChange('ifscCode', e.target.value.toUpperCase())}
                                                        onBlur={() => markTouched('ifscCode')}
                                                        state={getFieldState('ifscCode', formData.ifscCode, isIfscValid)}
                                                        hint="Enter a valid 11-character IFSC code (e.g. SBIN0000001)"
                                                        icon={Banknote}
                                                    />
                                                    <SmoothInput
                                                        label="Bank Name (Optional)"
                                                        value={formData.bankName}
                                                        onChange={e => handleFieldChange('bankName', e.target.value)}
                                                        onBlur={() => markTouched('bankName')}
                                                        state={getFieldState('bankName', formData.bankName, isBankNameValid)}
                                                        hint=""
                                                        icon={Building2}
                                                    />
                                                </div>
                                                <p className="text-xs text-slate-400 dark:text-slate-500 font-medium flex items-start gap-1.5">
                                                    <Info size={13} className="shrink-0 mt-0.5" />
                                                    You can skip this entire step and still submit your application — bank details can be added later from the Merchant Dashboard.
                                                </p>
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* ============ SUCCESS ============ */}
                                    {currentStep === 4 && (
                                        <motion.div
                                            key="success"
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ duration: 0.5, ease: "easeOut" }}
                                            className="flex flex-col items-center justify-center text-center p-4 py-10"
                                        >
                                            <div className="relative w-28 h-28 mb-8 flex items-center justify-center">
                                                <motion.div
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                                                    className="w-full h-full bg-gradient-to-tr from-[#D4AF37] to-[#B8860B] rounded-full flex items-center justify-center shadow-2xl shadow-[#D4AF37]/40"
                                                >
                                                    <Check className="w-14 h-14 text-white stroke-[3px]" />
                                                </motion.div>
                                                <motion.div
                                                    animate={{ scale: [1, 1.4, 1.4], opacity: [0.3, 0, 0] }}
                                                    transition={{ duration: 2, repeat: Infinity }}
                                                    className="absolute inset-0 bg-[#D4AF37] rounded-full -z-10"
                                                />
                                            </div>

                                            <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">
                                                {successStatus === 'approved' ? 'All Set!' : 'Submitted'}
                                            </h2>
                                            <p className="text-slate-500 dark:text-slate-400 text-base md:text-lg max-w-md mx-auto mb-10 leading-relaxed font-medium">
                                                {successStatus === 'approved'
                                                    ? <>Your merchant account is <span className="text-[#D4AF37] font-bold">ready to use</span>! Start selling gift cards and grow your business today.</>
                                                    : <>Your application is <span className="text-amber-500 font-bold">under review</span>. We will notify you once your account is verified.</>
                                                }
                                            </p>

                                            <div className="w-full max-w-sm space-y-4">
                                                <button
                                                    onClick={() => router.push('/merchant/dashboard')}
                                                    className="w-full min-h-[48px] py-3.5 bg-[#D4AF37] hover:bg-opacity-90 text-[#020617] font-bold rounded-xl shadow-lg shadow-[#D4AF37]/20 transition-all flex items-center justify-center gap-2 gold-glow"
                                                >
                                                    <Home size={20} />
                                                    Go to Dashboard
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Inline error (kept under the step content so it never shifts the layout) */}
                                {error && currentStep < 4 && (
                                    <div className="mt-4 p-4 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium border border-red-100 dark:border-red-500/20 flex items-start gap-2">
                                        <AlertCircle size={16} className="shrink-0 mt-0.5" />
                                        {error}
                                    </div>
                                )}
                            </div>

                            {/* Sticky Mobile Action Bar — Back (outline) + Next/Submit (solid) */}
                            {currentStep < 4 && (
                                <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 p-4 z-50 md:relative md:border-none md:bg-transparent md:p-0 md:mt-8 flex justify-between gap-3 pb-[calc(1rem_+_env(safe-area-inset-bottom))] dark:bg-[#0b1120] dark:border-white/10 md:dark:bg-transparent md:dark:border-transparent">
                                    <button
                                        onClick={prevStep}
                                        disabled={currentStep === 1 || loading}
                                        className="min-h-[44px] px-5 py-3 rounded-xl border-2 border-slate-200 dark:border-white/15 bg-white dark:bg-white/5 text-slate-700 dark:text-slate-200 font-bold text-sm hover:bg-slate-50 dark:hover:bg-white/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                                    >
                                        <ChevronLeft size={16} />
                                        Back
                                    </button>
                                    <button
                                        onClick={currentStep === 3 ? handleFormSubmit : nextStep}
                                        disabled={loading}
                                        className={`flex-1 md:flex-none min-h-[44px] px-8 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${loading
                                            ? 'bg-slate-300 dark:bg-white/10 text-slate-500 shadow-none cursor-not-allowed'
                                            : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/25 active:scale-[0.98]'}`}
                                    >
                                        {loading && <Loader2 size={16} className="animate-spin" />}
                                        {loading ? 'Submitting…' : currentStep === 3 ? 'Submit Application' : 'Next'}
                                        {!loading && currentStep < 3 && <ArrowRight size={16} />}
                                    </button>
                                </div>
                            )}
                        </main>
                    </div>
                </div>
            </motion.div>
        </>
    );
}

function TrustItem({ icon: Icon, title, text, delay }) {
    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay, duration: 0.5 }}
            className="flex items-start gap-4 p-5 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors"
        >
            <div className="shrink-0 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                <Icon size={20} className="text-[#D4AF37]" />
            </div>
            <div>
                <h3 className="font-bold text-white mb-0.5">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed font-medium">{text}</p>
            </div>
        </motion.div>
    );
}

// Visual Stepper — circles connected by a line, highlighting the current step.
// Completed steps are clickable (backward navigation only).
function WizardStepper({ currentStep, onStepClick }) {
    return (
        <ol className="flex items-start w-full select-none" aria-label="Application progress">
            {WIZARD_STEPS.map((s, i) => {
                const isDone = currentStep > s.n;
                const isCurrent = currentStep === s.n;
                const clickable = currentStep > s.n;
                return (
                    <li key={s.n} className="flex items-start flex-1 last:flex-none">
                        <button
                            type="button"
                            onClick={() => clickable && onStepClick(s.n)}
                            disabled={!clickable}
                            aria-current={isCurrent ? 'step' : undefined}
                            className="flex flex-col items-center gap-1.5"
                        >
                            <span className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${isCurrent
                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/30 scale-105'
                                : isDone
                                    ? 'bg-indigo-600 border-indigo-600 text-white'
                                    : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/15 text-slate-400 dark:text-slate-500'}`}
                            >
                                {isDone ? <Check size={16} strokeWidth={3} /> : s.n}
                            </span>
                            <span className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wider transition-colors ${isCurrent ? 'text-indigo-600 dark:text-indigo-400' : isDone ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400 dark:text-slate-500'}`}>
                                {s.label}
                            </span>
                        </button>
                        {i < WIZARD_STEPS.length - 1 && (
                            <div aria-hidden="true" className={`flex-1 h-0.5 mt-[17px] mx-2 rounded-full transition-colors ${currentStep > s.n ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-white/10'}`} />
                        )}
                    </li>
                );
            })}
        </ol>
    );
}

// Desktop sidebar trust badge
function TrustBadge({ icon: Icon, title, text }) {
    return (
        <div className="flex items-start gap-3 p-3 rounded-xl bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center shrink-0">
                <Icon size={18} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{title}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{text}</p>
            </div>
        </div>
    );
}

// Ultra Smooth Input — mobile-first: bold label above, min 44px touch target,
// subtle indigo focus ring, optional inline verification action.
// verificationState: null | 'verified' | 'pending' | 'failed'
function SmoothInput({
    label,
    className = "",
    icon: Icon,
    actionLabel,
    onAction,
    isVerifying,
    verificationState,
    state = 'idle',
    hint = '',
    required = false,
    ...props
}) {
    const isVerified = verificationState === 'verified';
    const isPending = verificationState === 'pending';
    const isValid = !verificationState && state === 'valid';
    const isInvalid = !verificationState && state === 'invalid';

    // Border/ring colour
    const borderClass = isVerified || isValid
        ? 'border-emerald-500/60 focus:border-emerald-500 focus:ring-emerald-500/30'
        : isPending
            ? 'border-amber-400/60 focus:border-amber-400 focus:ring-amber-400/30'
            : isInvalid
                ? 'border-red-400/70 focus:border-red-500 focus:ring-red-500/30'
                : 'border-slate-300 dark:border-white/15 focus:border-indigo-500 focus:ring-indigo-500/40';

    // Icon colour
    const iconClass = isVerified || isValid
        ? 'text-emerald-500'
        : isPending
            ? 'text-amber-400'
            : isInvalid
                ? 'text-red-500'
                : 'text-slate-400 dark:text-slate-500';

    return (
        <div className="group flex flex-col gap-1.5">
            <label className="flex items-center gap-1 text-sm font-bold text-slate-800 dark:text-slate-200">
                {label}
                {required && <span className="text-red-500" aria-hidden="true">*</span>}
            </label>
            <div className="relative">
                <input
                    className={`w-full min-h-[44px] py-3 px-4 ${Icon ? 'pl-11' : ''} ${actionLabel ? 'pr-28' : (state !== 'idle' ? 'pr-11' : '')} bg-white dark:bg-white/5 border ${borderClass} rounded-xl focus:ring-2 outline-none text-base font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 placeholder:font-normal shadow-sm transition-colors ${className}`}
                    placeholder={`Enter ${label}`}
                    readOnly={isVerifying || isVerified}
                    {...props}
                />
                {Icon && (
                    <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${iconClass} transition-colors pointer-events-none`}>
                        {isVerified ? <CheckCircle size={18} /> : <Icon size={18} />}
                    </div>
                )}

                {actionLabel && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        {isVerified ? (
                            <div className="px-3 py-1.5 min-h-[36px] bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-bold flex items-center gap-1.5">
                                <Check size={14} /> Verified
                            </div>
                        ) : isPending ? (
                            <div className="px-3 py-1.5 min-h-[36px] bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded-lg text-xs font-bold flex items-center gap-1.5">
                                <Loader2 size={14} className="animate-spin" /> Pending
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={onAction}
                                disabled={isVerifying || !props.value}
                                className={`px-3.5 py-2.5 min-h-[44px] rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${isVerifying || !props.value
                                    ? 'bg-slate-100 dark:bg-white/10 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                                    : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                                    }`}
                            >
                                {isVerifying && <Loader2 size={14} className="animate-spin" />}
                                {isVerifying ? 'Verifying…' : actionLabel}
                            </button>
                        )}
                    </div>
                )}

                {!actionLabel && state !== 'idle' && (
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                        {state === 'valid' && (
                            <CheckCircle2 size={18} className="text-emerald-500" />
                        )}
                        {state === 'invalid' && (
                            <AlertCircle size={18} className="text-red-500" />
                        )}
                    </div>
                )}
            </div>
            {state === 'invalid' && hint && (
                <p className="text-xs font-semibold text-red-500 flex items-center gap-1">
                    <AlertCircle size={13} className="shrink-0" />
                    {hint}
                </p>
            )}
        </div>
    );
}

// Smooth Select — same mobile-first treatment as SmoothInput
function SmoothSelect({ label, className = "", icon: Icon, state = 'idle', hint = '', required = false, options = [], ...props }) {
    const isInvalid = state === 'invalid';
    const borderClass = 'border-slate-300 dark:border-white/15 focus:border-indigo-500 focus:ring-indigo-500/40';

    return (
        <div className="group flex flex-col gap-1.5">
            <label className="flex items-center gap-1 text-sm font-bold text-slate-800 dark:text-slate-200">
                {label}
                {required && <span className="text-red-500" aria-hidden="true">*</span>}
            </label>
            <div className="relative">
                {Icon && (
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none">
                        <Icon size={18} />
                    </div>
                )}
                <select
                    className={`w-full min-h-[44px] py-3 px-4 ${Icon ? 'pl-11' : ''} pr-10 bg-white dark:bg-white/5 border ${borderClass} rounded-xl focus:ring-2 outline-none text-base font-semibold text-slate-900 dark:text-white appearance-none cursor-pointer shadow-sm transition-colors ${className}`}
                    {...props}
                >
                    {options.map(opt => (
                        <option key={opt.value} value={opt.value} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold">
                            {opt.label}
                        </option>
                    ))}
                </select>
                <ChevronDown size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
            {isInvalid && hint && (
                <p className="text-xs font-semibold text-red-500 flex items-center gap-1">
                    <AlertCircle size={13} className="shrink-0" />
                    {hint}
                </p>
            )}
        </div>
    );
}

// Smooth TextArea — mobile-first: bold label above, min 44px, indigo focus ring
function SmoothTextArea({ label, className = "", state = 'idle', hint = '', required = false, ...props }) {
    const isValid = state === 'valid';
    const isInvalid = state === 'invalid';

    const borderClass = isValid
        ? 'border-emerald-500/60 focus:border-emerald-500 focus:ring-emerald-500/30'
        : isInvalid
            ? 'border-red-400/70 focus:border-red-500 focus:ring-red-500/30'
            : 'border-slate-300 dark:border-white/15 focus:border-indigo-500 focus:ring-indigo-500/40';

    return (
        <div className="group flex flex-col gap-1.5">
            <label className="flex items-center gap-1 text-sm font-bold text-slate-800 dark:text-slate-200">
                {label}
                {required && <span className="text-red-500" aria-hidden="true">*</span>}
            </label>
            <textarea
                className={`w-full px-4 py-3 min-h-[44px] bg-white dark:bg-white/5 border ${borderClass} rounded-xl focus:ring-2 outline-none text-base font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 placeholder:font-normal shadow-sm resize-none ${className}`}
                placeholder={`Enter ${label}`}
                rows={3}
                {...props}
            />
            {isInvalid && hint && (
                <p className="text-xs font-semibold text-red-500 flex items-center gap-1">
                    <AlertCircle size={13} className="shrink-0" />
                    {hint}
                </p>
            )}
        </div>
    );
}
