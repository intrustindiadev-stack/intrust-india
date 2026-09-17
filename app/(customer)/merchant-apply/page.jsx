'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    Building2, FileText, Upload, CheckCircle, ArrowRight, Shield,
    Loader2, ChevronLeft, Store, TrendingUp, Users, Check, Sparkles, CreditCard, Banknote, X, Home, Share2, Info, AlertCircle, CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/contexts/AuthContext';
import { createClient } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { verifyGSTIN } from '@/app/actions/sprintVerifyActions';
import MerchantApplyShowcase from '@/components/merchant/MerchantApplyShowcase';
import { MERCHANT_DEPARTMENTS } from '@/lib/constants/departments';
import { useForm } from 'react-hook-form';

export const DRAFT_STORAGE_KEY = 'intrust_merchant_apply_draft';

const DEFAULT_FORM_VALUES = {
    businessName: '',
    gstNumber: '',
    ownerName: '',
    phone: '',
    email: '',
    address: '',
    bankAccount: '',
    bankAccountName: '',
    bankName: '',
    ifscCode: '',
    confirmBankAccount: '',
    panCard: '',
    merchantReferralCode: '',
    department: 'grocery',
};

// Confetti Component
const Confetti = () => {
    return (
        <div className="fixed inset-0 pointer-events-none overflow-hidden select-none z-50">
            {[...Array(50)].map((_, i) => (
                <motion.div
                    key={i}
                    initial={{
                        top: -20,
                        left: Math.random() * 100 + "%",
                        scale: 0,
                    }}
                    animate={{
                        top: "100%",
                        scale: [0, 1, 0.5],
                        rotate: Math.random() * 360,
                    }}
                    transition={{
                        duration: Math.random() * 2 + 2,
                        delay: Math.random() * 0.5,
                        ease: "linear",
                        repeat: 0
                    }}
                    className="absolute w-3 h-3 rounded-full"
                    style={{
                        backgroundColor: ['#2563EB', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'][Math.floor(Math.random() * 5)]
                    }}
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
    const [step, setStep] = useState(1);
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

        const step2Error = validateStep2();
        if (step2Error) {
            setTouched(p => ({
                ...p,
                panCard: true,
                bankAccountName: true,
                bankAccount: true,
                confirmBankAccount: true,
                ifscCode: true,
                bankName: true,
            }));
            setError(step2Error);
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
            setStep(3); // Move to Success Step
        } catch (err) {
            console.error('❌ Error submitting merchant application:', err);
            setError(err.message || 'Failed to submit application. Please try again.');
            setLoading(false);
        }
    };

    const validateStep1 = () => {
        if (!formData.businessName.trim()) return "Business Name is required";

        // GSTIN Validation (Optional, but if filled must be valid)
        if (formData.gstNumber) {
            const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
            if (!gstinRegex.test(formData.gstNumber)) return "Invalid GSTIN format (e.g., 22AAAAA0000A1Z5)";
        }

        if (!formData.ownerName.trim()) return "Owner Name is required";

        // Mobile Validation (10 digits, starts with 6-9)
        const mobileRegex = /^[6-9]\d{9}$/;
        if (!mobileRegex.test(formData.phone)) return "Invalid Mobile Number (must be 10 digits starting with 6-9)";

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) return "Invalid Email Address";

        if (!formData.address.trim()) return "Address is required";

        return null;
    };

    const validateStep2 = () => {
        if (!formData.panCard) {
            toast.error("Please enter your PAN Number.");
            return "Please enter your PAN Number.";
        }

        const pan = formData.panCard.trim().toUpperCase();
        const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
        if (!panRegex.test(pan)) {
            toast.error("Invalid PAN format.");
            return "Invalid PAN format.";
        }

        const accHolderName = (formData.bankAccountName || '').trim();
        const accNum = (formData.bankAccount || '').trim();
        const confirmAccNum = (formData.confirmBankAccount || '').trim();
        const ifsc = (formData.ifscCode || '').trim().toUpperCase();
        const bankName = (formData.bankName || '').trim();

        const hasAnyBankField = Boolean(accHolderName || accNum || confirmAccNum || ifsc || bankName);

        if (!hasAnyBankField) {
            return null;
        }

        if (!accHolderName) {
            toast.error("Please enter the Account Holder Name.");
            return "Please enter the Account Holder Name.";
        }

        if (!accNum || !ifsc) {
            toast.error("Please enter your Bank Account details.");
            return "Please enter your Bank Account details.";
        }

        if (formData.bankAccount !== formData.confirmBankAccount) {
            toast.error("Account numbers do not match.");
            return "Account numbers do not match.";
        }

        const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
        if (!ifscRegex.test(ifsc)) {
            toast.error("Invalid IFSC format.");
            return "Invalid IFSC format.";
        }

        return null;
    };

    const nextStep = () => {
        let errorMsg = null;
        if (step === 1) errorMsg = validateStep1();
        else if (step === 2) errorMsg = validateStep2();

        if (errorMsg) {
            if (step === 1) {
                setTouched(p => ({
                    ...p,
                    businessName: true,
                    gstNumber: true,
                    ownerName: true,
                    phone: true,
                    email: true,
                    address: true,
                    merchantReferralCode: true,
                }));
                alert(errorMsg);
            } else if (step === 2) {
                setTouched(p => ({
                    ...p,
                    panCard: true,
                    bankAccountName: true,
                    bankAccount: true,
                    confirmBankAccount: true,
                    ifscCode: true,
                    bankName: true,
                }));
            }
            return;
        }
        setStep(step + 1);
    };
    const prevStep = () => setStep(step - 1);

    // Calculate progress for the progress bar
    const progress = (step / 2) * 100;

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
                className="h-screen w-full bg-white dark:bg-[#020617] font-[family-name:var(--font-outfit)] overflow-hidden relative flex flex-col md:flex-row transition-colors"
            >

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

            {/* Mobile/Right: App-Like Form Container */}
            <div className="flex-1 h-full relative flex flex-col bg-white dark:bg-[#020617] transition-colors">
                {step === 3 && <Confetti />}

                {/* Mobile Header / Navbar Replacement (Hide on Success) */}
                {step < 3 && (
                    <div className="px-6 py-5 border-b border-black/5 dark:border-white/10 flex items-center justify-between bg-white/80 dark:bg-[#020617]/80 backdrop-blur-md z-20 sticky top-0 transition-colors">
                        <div className="flex items-center gap-3">
                            <button onClick={() => router.back()} className="w-9 h-9 rounded-full bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                                <X size={18} />
                            </button>
                            <span className="font-bold text-slate-800 dark:text-slate-100 text-lg">Become a Partner</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Step {step} of 2</span>
                            <div className="w-24 h-2.5 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    transition={{ duration: 0.5 }}
                                    className="h-full bg-[#D4AF37] rounded-full"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-12 md:max-w-2xl md:mx-auto w-full custom-scrollbar relative">
                    <AnimatePresence mode="wait">
                        {step === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                                className="py-2"
                            >
                                <div className="mb-10">
                                    <h2 className="text-4xl sm:text-5xl font-display font-black text-slate-900 dark:text-white mb-4 tracking-tight">Business Details</h2>
                                    <div className="flex flex-col gap-2">
                                        <p className="text-xl text-slate-500 dark:text-slate-400 font-semibold">Tell us about your business to get started.</p>
                                        {profile?.kyc_status === 'verified' && (
                                            <div className="inline-flex max-w-fit items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 text-sm font-bold border border-green-200 dark:border-green-500/30">
                                                <CheckCircle size={16} /> KYC Verified — Identity Confirmed
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-10">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                        <SmoothInput
                                            label="Business Name"
                                            value={formData.businessName}
                                            onChange={e => handleFieldChange('businessName', e.target.value)}
                                            onBlur={() => markTouched('businessName')}
                                            state={getFieldState('businessName', formData.businessName, isBusinessNameValid)}
                                            hint="Business name must be at least 3 characters"
                                            autoFocus
                                            icon={Store}
                                        />
                                        <div className="relative flex flex-col justify-end">
                                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 block uppercase tracking-wider">
                                                Business Department / Category *
                                            </label>
                                            <div className="relative">
                                                <select
                                                    value={formData.department || 'grocery'}
                                                    onChange={e => handleFieldChange('department', e.target.value)}
                                                    className="w-full px-5 py-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white font-bold text-base focus:outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none cursor-pointer"
                                                >
                                                    {MERCHANT_DEPARTMENTS.map(dept => (
                                                        <option key={dept.key} value={dept.key} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold">
                                                            {dept.label} ({dept.badge})
                                                        </option>
                                                    ))}
                                                </select>
                                                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-xs text-slate-400">
                                                    ▼
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
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
                                            label="Owner Name"
                                            value={formData.ownerName}
                                            onChange={e => handleFieldChange('ownerName', e.target.value)}
                                            onBlur={() => markTouched('ownerName')}
                                            state={getFieldState('ownerName', formData.ownerName, isOwnerNameValid)}
                                            hint="Owner name must be at least 3 characters"
                                            icon={Users}
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                        <SmoothInput
                                            label="Mobile Number"
                                            type="tel"
                                            value={formData.phone}
                                            onChange={e => handleFieldChange('phone', e.target.value)}
                                            onBlur={() => markTouched('phone')}
                                            state={getFieldState('phone', formData.phone, isPhoneValid)}
                                            hint="Enter a valid 10-digit mobile number starting with 6-9"
                                            icon={TrendingUp}
                                        />
                                        <SmoothInput
                                            label="Email Address"
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
                                        value={formData.address}
                                        onChange={e => handleFieldChange('address', e.target.value)}
                                        onBlur={() => markTouched('address')}
                                        state={getFieldState('address', formData.address, isAddressValid)}
                                        hint="Address must be at least 10 characters"
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

                        {step === 2 && (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                                className="py-2"
                            >
                                <div className="mb-10">
                                    <h2 className="text-4xl sm:text-5xl font-display font-black text-slate-900 dark:text-white mb-4 tracking-tight">Banking Details</h2>
                                    <p className="text-xl text-slate-500 dark:text-slate-400 font-semibold">Connect your bank account for settlements — or skip and add it later.</p>
                                </div>

                                <div className="space-y-10">
                                    <div className="p-6 bg-blue-500/5 rounded-2xl border border-blue-500/10 dark:border-blue-500/20 flex gap-4 items-start">
                                        <div className="bg-blue-500/10 p-2 rounded-full text-blue-600 dark:text-blue-400 shrink-0">
                                            <Shield size={20} />
                                        </div>
                                        <div>
                                            <p className="font-black text-blue-900 dark:text-blue-100 text-lg">Secure Verification</p>
                                            <p className="text-blue-700/80 dark:text-blue-300/60 text-base mt-2 leading-relaxed font-semibold">We will deposit ₹1 to verify this account automatically. Your banking details are encrypted with 256-bit SSL.</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-3 items-start p-4 rounded-2xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20">
                                        <Info size={18} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="font-bold text-blue-900 dark:text-blue-100 text-sm">Bank details are optional</p>
                                            <p className="text-blue-700/80 dark:text-blue-300/70 text-sm mt-1 leading-relaxed font-medium">Optional: Skip for now. You can securely add your banking and settlement details later from your Merchant Dashboard once your account is approved.</p>
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
                                        autoFocus
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
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
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
                                    <SmoothInput
                                        label="PAN Number"
                                        value={formData.panCard}
                                        onChange={e => handleFieldChange('panCard', e.target.value.toUpperCase())}
                                        onBlur={() => markTouched('panCard')}
                                        state={getFieldState('panCard', formData.panCard, isPanValid)}
                                        hint="Enter a valid 10-character PAN (e.g. ABCDE1234F)"
                                        icon={FileText}
                                    />

                                    {error && (
                                        <div className="p-4 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium border border-red-100 dark:border-red-500/20">
                                            {error}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {step === 3 && (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.5, ease: "easeOut" }}
                                className="h-full flex flex-col items-center justify-center text-center p-4"
                            >
                                <div className="relative w-32 h-32 mb-8 flex items-center justify-center">
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: "spring", stiffness: 200, damping: 15 }}
                                        className="w-full h-full bg-gradient-to-tr from-[#D4AF37] to-[#B8860B] rounded-full flex items-center justify-center shadow-2xl shadow-[#D4AF37]/40"
                                    >
                                        <Check className="w-16 h-16 text-white stroke-[3px]" />
                                    </motion.div>
                                    <motion.div
                                        animate={{ scale: [1, 1.4, 1.4], opacity: [0.3, 0, 0] }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                        className="absolute inset-0 bg-[#D4AF37] rounded-full -z-10"
                                    />
                                </div>

                                <h2 className="text-5xl font-display font-black text-slate-900 dark:text-white mb-6 tracking-tight">
                                    {successStatus === 'approved' ? 'All Set!' : 'Submitted'}
                                </h2>
                                <p className="text-slate-500 dark:text-slate-400 text-2xl max-w-lg mx-auto mb-12 leading-relaxed font-bold">
                                    {successStatus === 'approved'
                                        ? <>Your merchant account is <span className="text-[#D4AF37]">ready to use</span>! Start selling gift cards and grow your business today.</>
                                        : <>Your application is <span className="text-amber-500">under review</span>. We will notify you once your account is verified.</>
                                    }
                                </p>

                                <div className="w-full max-w-sm space-y-4">
                                    <button
                                        onClick={() => router.push('/merchant/dashboard')}
                                        className="w-full py-6 bg-[#D4AF37] hover:bg-opacity-90 text-[#020617] font-black rounded-3xl shadow-2xl shadow-[#D4AF37]/20 transition-all flex items-center justify-center gap-3 text-2xl gold-glow"
                                    >
                                        <Home size={28} />
                                        Go to Dashboard
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Fixed Bottom Action Bar (App Style - Hide on Success) */}
                {step < 3 && (
                    <div className="p-8 pb-10 bg-white dark:bg-[#020617] border-t border-black/5 dark:border-white/10 flex items-center justify-between gap-6 z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.03)] dark:shadow-none transition-colors">
                        <button
                            onClick={prevStep}
                            disabled={step === 1 || loading}
                            className={`px-8 py-5 rounded-2xl font-black text-lg text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-all ${step === 1 ? 'opacity-0 pointer-events-none' : ''}`}
                        >
                            Back
                        </button>
                        <button
                            onClick={step === 2 ? handleFormSubmit : nextStep}
                            disabled={loading || (step === 2 && (!formData.panCard))}
                            className={`flex-1 flex gap-3 justify-center items-center py-5 rounded-2xl text-white dark:text-[#020617] font-black shadow-lg transition-all text-xl ${(loading || (step === 2 && (!formData.panCard))) ? 'bg-slate-200 dark:bg-white/5 shadow-none text-slate-400 cursor-not-allowed' : 'bg-[#D4AF37] shadow-[#D4AF37]/20 hover:shadow-[#D4AF37]/30 hover:scale-[1.02] active:scale-[0.98] gold-glow'}`}
                        >
                            {loading && <Loader2 className="animate-spin" size={24} />}
                            {loading ? 'Submitting...' : step === 2 ? 'Submit Application' : 'Continue'}
                            {!loading && step === 1 && <ArrowRight size={24} />}
                        </button>
                    </div>
                )}
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

// Ultra Smooth Inputs with verification action
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
    ...props
}) {
    const isVerified = verificationState === 'verified';
    const isPending = verificationState === 'pending';
    const isValid = !verificationState && state === 'valid';
    const isInvalid = !verificationState && state === 'invalid';

    // Border/ring colour
    const borderClass = isVerified || isValid
        ? 'border-green-500/50 focus:border-green-500/50 focus:ring-green-500/10'
        : isPending
            ? 'border-amber-400/50 focus:border-amber-400/50 focus:ring-amber-400/10'
            : isInvalid
                ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/10'
                : 'border-black/5 dark:border-white/10 focus:border-[#D4AF37]/50 focus:ring-[#D4AF37]/10';

    // Icon colour
    const iconClass = isVerified || isValid
        ? 'text-green-500'
        : isPending
            ? 'text-amber-400'
            : isInvalid
                ? 'text-red-500'
                : 'text-slate-400 dark:text-slate-500 group-focus-within:text-[#D4AF37]';

    return (
        <div className="group">
            <div className="flex justify-between items-end mb-3">
                <label className="block text-lg font-bold text-slate-700 dark:text-slate-300 ml-1 group-focus-within:text-[#D4AF37] transition-colors">
                    {label}
                </label>
            </div>
            <div className="relative transform transition-all duration-200 group-focus-within:scale-[1.01]">
                <input
                    className={`w-full px-6 py-5 pl-14 ${actionLabel ? 'pr-28' : (!actionLabel && state !== 'idle' ? 'pr-14' : '')} bg-slate-50 dark:bg-white/5 border ${borderClass} rounded-2xl focus:ring-4 transition-all outline-none font-bold text-xl text-slate-800 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-700 shadow-sm ${className}`}
                    placeholder={`Enter ${label}`}
                    readOnly={isVerifying || isVerified}
                    {...props}
                />
                <div className={`absolute left-5 top-1/2 -translate-y-1/2 ${iconClass} transition-colors`}>
                    {isVerified ? <CheckCircle size={24} /> : (Icon && <Icon size={24} />)}
                </div>

                {actionLabel && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {isVerified ? (
                            <div className="px-4 py-2 bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 rounded-xl text-sm font-black flex items-center gap-1.5">
                                <Check size={18} /> Verified
                            </div>
                        ) : isPending ? (
                            <div className="px-4 py-2 bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded-xl text-sm font-black flex items-center gap-1.5">
                                <Loader2 size={18} className="animate-spin" /> Pending
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={onAction}
                                disabled={isVerifying || !props.value}
                                className={`px-4 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${isVerifying || !props.value
                                    ? 'bg-slate-200 dark:bg-white/10 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                                    : 'bg-[#D4AF37] text-[#020617] hover:bg-opacity-90 shadow-sm'
                                    }`}
                            >
                                {isVerifying && <Loader2 size={16} className="animate-spin" />}
                                {isVerifying ? 'Verifying...' : actionLabel}
                            </button>
                        )}
                    </div>
                )}

                {!actionLabel && state !== 'idle' && (
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
                        {state === 'valid' && (
                            <CheckCircle2 size={22} className="text-green-500" />
                        )}
                        {state === 'invalid' && (
                            <AlertCircle size={22} className="text-red-500" />
                        )}
                    </div>
                )}
            </div>
            {state === 'invalid' && hint && (
                <p className="mt-2 ml-1 text-sm font-semibold text-red-500 flex items-center gap-1">
                    <AlertCircle size={14} className="shrink-0" />
                    {hint}
                </p>
            )}
        </div>
    );
}

function SmoothTextArea({ label, className = "", state = 'idle', hint = '', ...props }) {
    const isValid = state === 'valid';
    const isInvalid = state === 'invalid';

    const borderClass = isValid
        ? 'border-green-500/50 focus:border-green-500/50 focus:ring-green-500/10'
        : isInvalid
            ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/10'
            : 'border-black/5 dark:border-white/10 focus:border-[#D4AF37]/50 focus:ring-[#D4AF37]/10';

    return (
        <div className="group">
            <label className="block text-lg font-bold text-slate-700 dark:text-slate-300 mb-3 ml-1 group-focus-within:text-[#D4AF37] transition-colors">
                {label}
            </label>
            <div className="relative transform transition-all duration-200 group-focus-within:scale-[1.01]">
                <textarea
                    className={`w-full px-6 py-5 bg-slate-50 dark:bg-white/5 border ${borderClass} rounded-2xl focus:ring-4 transition-all outline-none font-bold text-xl text-slate-800 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-700 shadow-sm resize-none ${className}`}
                    placeholder={`Enter ${label}`}
                    rows={4}
                    {...props}
                />
            </div>
            {isInvalid && hint && (
                <p className="mt-2 ml-1 text-sm font-semibold text-red-500 flex items-center gap-1">
                    <AlertCircle size={14} className="shrink-0" />
                    {hint}
                </p>
            )}
        </div>
    );
}
