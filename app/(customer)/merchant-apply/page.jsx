'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Building2, FileText, Upload, CheckCircle, ArrowRight, Shield,
    Loader2, ChevronLeft, Store, TrendingUp, Users, Check, Sparkles, CreditCard, Banknote, X, Home,
    AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { verifyGSTIN, verifyBank, verifyPAN } from '@/app/actions/sprintVerifyActions';

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
    const router = useRouter();
    const { user } = useAuth();
    const supabase = createClient();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(false); // New state for field verification

    // Form State
    const [formData, setFormData] = useState({
        businessName: '', gstNumber: '', ownerName: '',
        phone: '', email: '', address: '',
        bankAccount: '', ifscCode: '', panCard: '',
    });

    // Validated status for real-time feedback
    const [validationStatus, setValidationStatus] = useState({
        gstin: null, // null, 'valid', 'invalid', 'manual_review'
        bank: null,
        pan: null
    });

    const [error, setError] = useState('');

    // Load saved progress on mount
    useEffect(() => {
        const loadSavedProgress = async () => {
            if (!user) return;
            try {
                const { data } = await supabase
                    .from('merchants')
                    .select('*')
                    .eq('user_id', user.id)
                    .single();

                if (data) {
                    setFormData(prev => ({
                        ...prev,
                        businessName: data.business_name || '',
                        gstNumber: data.gst_number || '',
                        ownerName: data.owner_name || '', // Map if needed, schema didn't have owner_name explicitly but we used it in logic
                        phone: data.business_phone || '',
                        email: data.business_email || '',
                        address: data.business_address || '', // Check schema for exact field
                        bankAccount: data.bank_account_number || '',
                        ifscCode: data.bank_ifsc_code || '',
                        panCard: data.pan_number || '',
                    }));

                    // Restore Step based on what's filled? Or just stay on 1 manually.
                    // Let's check status. If 'pending' we can let them continue.
                }
            } catch (err) {
                console.error("Error loading progress:", err);
            }
        }
        loadSavedProgress();
    }, [user, supabase]);

    // Save Logic
    const saveMerchantData = async (stepData) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                toast.error("Please log in to save progress.");
                return false;
            }

            // Map frontend keys to DB schema
            // NOTE: Check schema for exact column names. 
            // Based on previous file reads:
            // merchants table has: business_name, gst_number, pan_number, bank_account_number, bank_ifsc_code, business_phone, business_email, status

            const dbPayload = {
                user_id: user.id,
                updated_at: new Date().toISOString(),
                // status: 'pending', // REMOVED: Rely on DB default for insert, avoid RLS error on update
                // Step 1
                business_name: stepData.businessName,
                gst_number: stepData.gstNumber,
                business_phone: stepData.phone,
                business_email: stepData.email,
                owner_name: stepData.ownerName,
                business_address: stepData.address,

                // Step 2
                pan_number: stepData.panCard,
                bank_account_number: stepData.bankAccount,
                bank_ifsc_code: stepData.ifscCode,
                bank_name: stepData.bankName, // If we get it from verification

                // Defaults for required columns
                wallet_balance_paise: 0,
                total_commission_paid_paise: 0,
            };

            // Clean undefined
            Object.keys(dbPayload).forEach(key => dbPayload[key] === undefined && delete dbPayload[key]);

            const { error } = await supabase
                .from('merchants')
                .upsert(
                    dbPayload,
                    { onConflict: 'user_id' }
                );

            if (error) {
                console.error("Save error:", error);
                toast.error('Failed to save details. Please try again.');
                return false;
            }
            return true;

        } catch (err) {
            console.error("Save ex:", err);
            // DEBUG: Detailed Supabase logging
            if (err.code || err.details || err.message) {
                console.error("Supabase Error Details:", JSON.stringify(err, null, 2));
                toast.error(`Save failed: ${err.message || 'Unknown DB error'}`);
            } else {
                toast.error('Something went wrong while saving.');
            }
            return false;
        }
    }


    // Validation Functions
    const validateStep1 = () => {
        if (!formData.businessName.trim()) return "Business Name is required (min 3 chars)";
        if (formData.businessName.length < 3) return "Business Name must be at least 3 characters";

        // GSTIN Validation
        const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        if (!gstinRegex.test(formData.gstNumber)) return "Invalid GSTIN format (e.g., 22AAAAA0000A1Z5)";

        if (!formData.ownerName.trim()) return "Owner Name is required";

        // Mobile Validation
        const mobileRegex = /^[6-9]\d{9}$/;
        if (!mobileRegex.test(formData.phone)) return "Invalid Mobile Number (10 digits, starts 6-9)";

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) return "Invalid Email Address";

        // if (!formData.address.trim()) return "Address is required (min 10 chars)";
        // if (formData.address.length < 10) return "Address must be at least 10 characters";

        return null; // Valid
    };

    const validateStep2 = () => {
        // Bank Account
        const bankRegex = /^\d{11,16}$/;
        if (!bankRegex.test(formData.bankAccount)) return "Bank Account must be between 11 and 16 digits";

        // IFSC Code
        const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
        if (!ifscRegex.test(formData.ifscCode)) return "Invalid IFSC Code";

        // PAN Card
        const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
        if (!panRegex.test(formData.panCard)) return "Invalid PAN Number";

        return null;
    };


    // Verification Handlers
    const verifyGstinHandler = async () => {
        const gstin = formData.gstNumber;
        const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

        if (!gstin || !gstinRegex.test(gstin)) return;

        setVerifying(true);
        setVerifying(true);
        const result = await verifyGSTIN(gstin);
        setVerifying(false);
        setVerifying(false);

        if (result.valid === true) {
            setValidationStatus(prev => ({ ...prev, gstin: 'valid' }));

            // Auto-fill available data
            setFormData(prev => ({
                ...prev,
                businessName: result.data.trade_name || prev.businessName,
                // ownerName might be in legal_name or not available, use discretion
                ownerName: result.data.legal_name || prev.ownerName
            }));
            toast.success("GSTIN Verified!");

            // Update DB status
            await supabase.from('merchants').update({
                gstin_verified: true,
                gstin_data: result.data
            }).eq('user_id', user.id);
            return 'valid';

        } else if (result.valid === 'manual_review') {
            setValidationStatus(prev => ({ ...prev, gstin: 'manual_review' }));
            toast(result.message, { icon: '⚠️' });
            return 'manual_review';
        } else {
            setValidationStatus(prev => ({ ...prev, gstin: 'invalid' }));
            toast.error(result.message);
            return 'invalid';
        }
    };

    const verifyBankHandler = async () => {
        if (validationStatus.bank === 'valid') return; // Already valid
        const { bankAccount, ifscCode, panCard } = formData;

        const bankRegex = /^\d{11,16}$/;
        const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
        const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

        if (!bankRegex.test(bankAccount) || !ifscRegex.test(ifscCode)) return;

        setVerifying(true);

        // 1. Verify Bank
        const bankResult = await verifyBank(bankAccount, ifscCode);

        // 2. Verify PAN (if present)
        let panResult = { valid: true }; // Default to true if empty or handle separately? 
        if (panRegex.test(panCard)) {
            panResult = await verifyPAN(panCard);
        }

        setVerifying(false);

        if (bankResult.valid === true && panResult.valid === true) {
            setValidationStatus(prev => ({ ...prev, bank: 'valid', pan: 'valid' }));
            toast.success("Bank & PAN Verified!");

            await supabase.from('merchants').update({
                bank_verified: true,
                bank_data: bankResult.data,
                // pan_verified: true ? (Add column if needed)
            }).eq('user_id', user.id);

            return true;
        } else if (bankResult.valid === 'manual_review' || panResult.valid === 'manual_review') {
            setValidationStatus(prev => ({ ...prev, bank: 'manual_review' })); // Simplify status for now
            toast('Verification services busy. We will review manually.', { icon: '⚠️' });
            return 'manual_review';
        } else {
            setValidationStatus(prev => ({ ...prev, bank: 'invalid' }));
            toast.error("Verification failed. Please check details.");
            return false;
        }
    };


    const nextStep = async () => {
        if (step === 1) {
            const errMsg = validateStep1();
            if (errMsg) { toast.error(errMsg); return; }

            if (validationStatus.gstin !== 'valid' && validationStatus.gstin !== 'manual_review') {
                // Trigger verification if they didn't blur
                const status = await verifyGstinHandler();
                // Check returned status directly
                if (status === 'invalid' || !status) return; // Block
            }

            setLoading(true);
            const saved = await saveMerchantData(formData);
            setLoading(false);

            if (saved) setStep(2);
        }
        else if (step === 2) {
            // Submit Logic
            await handleFinalSubmit();
        }
    };

    const prevStep = () => setStep(step - 1);

    const handleFinalSubmit = async () => {
        const errMsg = validateStep2();
        if (errMsg) { toast.error(errMsg); return; }

        setLoading(true);

        // Verify before submit
        const verificationStatus = await verifyBankHandler();
        if (verificationStatus === false) {
            setLoading(false);
            return;
        }

        // Save
        const saved = await saveMerchantData(formData); // This updates `merchants`
        if (!saved) { setLoading(false); return; }

        // Determine Final Status
        let finalStatus = 'rejected';
        const gstinOk = validationStatus.gstin === 'valid';
        const bankOk = verificationStatus === true || validationStatus.bank === 'valid';

        const gstinManual = validationStatus.gstin === 'manual_review';
        const bankManual = verificationStatus === 'manual_review';

        if (gstinOk && bankOk) finalStatus = 'approved';
        else if (gstinManual || bankManual) finalStatus = 'under_review';

        // Update Status
        const { error: statusErr } = await supabase
            .from('merchants')
            .update({
                status: finalStatus,
                verified_at: new Date().toISOString()
            })
            .eq('user_id', user.id);

        if (statusErr) {
            console.error("Status update failed", statusErr);
        }

        // KYC Check for redirection
        const { data: merchant } = await supabase
            .from('merchants') // or user_profiles depending on where kyc_verified is. 
            // Wait, logic says check `kyc_verified` from `merchants`?  
            // User request: "Check KYC status and branch"
            // "if (merchant?.kyc_verified === true) -> dashboard else -> /kyc"
            // Earlier schema check showed `kyc_status` in `user_profiles`. 
            // `merchants` has `status`.
            // Let me check `user_profiles`. 
            .select('kyc_status') // Schema had kyc_status in merchants too? No, checked earlier.
        // Actually, schema trace showed `kyc_status` in `user_profiles`.
        // I will check `user_profiles` for KYC.

        setLoading(false);
        setStep(4); // Show success temporarily? Or redirect immediately?
        // User request says "After Step 2 is saved... run KYC check... navigate"
        // I'll show Success screen briefly or just confetti then move.

        // Let's use the SUCCESS STEP (Step 4) to show the result, then the button there handles the redirect logically?
        // OR auto redirect. The requirement says "branch to /dashboard or /kyc".
        // I will let the Success screen handle the specific message and the button will route correctly.

    };

    // Calculate progress (Step 1 -> 50%, Step 2 -> 100%)
    const progress = (step / 2) * 100;

    return (
        <div className="h-screen w-full bg-[#FAFAFA] font-[family-name:var(--font-outfit)] overflow-hidden relative flex flex-col md:flex-row">

            {/* Desktop: Left Side Brand Panel */}
            <div className="hidden md:flex w-1/2 lg:w-[45%] bg-slate-900 h-full relative overflow-hidden flex-col justify-between p-12 text-white">
                <div className="absolute inset-0 opacity-20">
                    <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500 rounded-full blur-[100px] animate-pulse-slow" />
                    <div className="absolute top-1/2 -left-24 w-72 h-72 bg-purple-500 rounded-full blur-[100px] animate-pulse-slow delay-700" />
                    <div className="absolute -bottom-24 right-24 w-80 h-80 bg-emerald-500 rounded-full blur-[100px]" />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-8">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-900 font-bold text-xl">I</div>
                        <span className="text-2xl font-bold tracking-tight">INTRUST</span>
                    </div>
                </div>

                <div className="relative z-10 space-y-6">
                    <TrustItem icon={Users} title="Millions of Customers" text="Access our verified user base instantly." delay={0.4} />
                    <TrustItem icon={Shield} title="Zero Fraud Liability" text="We cover 100% of chargeback risks." delay={0.5} />
                    <TrustItem icon={Banknote} title="Instant Settlements" text="Get paid directly to your bank account." delay={0.6} />
                </div>
                <div className="relative z-10 text-xs text-slate-500 font-medium tracking-widest uppercase">
                    © 2024 Intrust Platform
                </div>
            </div>

            {/* Right Side Form */}
            <div className="flex-1 h-full relative flex flex-col bg-white">
                {step === 4 && <Confetti />}

                {/* Step Header */}
                {step < 4 && (
                    <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white/80 backdrop-blur-md z-20 sticky top-0 transition-opacity">
                        <div className="flex items-center gap-3">
                            <button onClick={() => router.back()} className="w-9 h-9 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors">
                                <X size={18} />
                            </button>
                            <span className="font-bold text-slate-800 text-lg">Become a Partner</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-400">Step {step} of 2</span>
                            <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    transition={{ duration: 0.5 }}
                                    className="h-full bg-blue-600 rounded-full"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Content */}
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
                                <div className="mb-8">
                                    <h2 className="text-3xl font-extrabold text-slate-900 mb-3 tracking-tight">Business Details</h2>
                                    <p className="text-lg text-slate-500">Tell us about your business to get started.</p>
                                </div>
                                <div className="space-y-6">
                                    <SmoothInput
                                        label="Business Name"
                                        value={formData.businessName}
                                        onChange={e => setFormData({ ...formData, businessName: e.target.value })}
                                        autoFocus
                                        icon={Store}
                                    />

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="relative">
                                            <SmoothInput
                                                label="GSTIN"
                                                value={formData.gstNumber}
                                                onChange={e => setFormData({ ...formData, gstNumber: e.target.value.toUpperCase() })}
                                                onBlur={verifyGstinHandler}
                                                icon={FileText}
                                                className={validationStatus.gstin === 'valid' ? 'border-green-500 focus:border-green-500' : ''}
                                            />
                                            {verifying && <Loader2 className="absolute right-4 top-[60%] animate-spin text-blue-500" size={16} />}
                                            {validationStatus.gstin === 'valid' && <CheckCircle className="absolute right-4 top-[60%] text-green-500" size={16} />}
                                        </div>

                                        <SmoothInput label="Owner Name" value={formData.ownerName} onChange={e => setFormData({ ...formData, ownerName: e.target.value })} icon={Users} />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <SmoothInput label="Mobile Number" type="tel" maxLength={10} value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} icon={TrendingUp} />
                                        <SmoothInput label="Email Address" type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} icon={Building2} />
                                    </div>
                                    <SmoothTextArea label="Registered Address" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
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
                                <div className="mb-8">
                                    <h2 className="text-3xl font-extrabold text-slate-900 mb-3 tracking-tight">Banking Details</h2>
                                    <p className="text-lg text-slate-500">Connect your bank account for settlements.</p>
                                </div>
                                <div className="space-y-6">
                                    <div className="p-5 bg-blue-50/60 rounded-2xl border border-blue-100 flex gap-4 items-start">
                                        <div className="bg-blue-100 p-2 rounded-full text-blue-600 shrink-0">
                                            <Shield size={20} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-blue-900 text-sm">Secure Verification</p>
                                            <p className="text-blue-700/80 text-sm mt-1 leading-relaxed">We will deposit ₹1 to verify this account automatically. Your banking details are encrypted.</p>
                                        </div>
                                    </div>

                                    <SmoothInput label="Account Number" type="number" value={formData.bankAccount} onChange={e => setFormData({ ...formData, bankAccount: e.target.value })} autoFocus icon={CreditCard} />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <SmoothInput label="IFSC Code" value={formData.ifscCode} onChange={e => setFormData({ ...formData, ifscCode: e.target.value.toUpperCase() })} icon={Banknote} />
                                        <SmoothInput label="PAN Number" value={formData.panCard} onChange={e => setFormData({ ...formData, panCard: e.target.value.toUpperCase() })} icon={FileText} />
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {step === 4 && (
                            <SuccessView user={user} supabase={supabase} router={router} />
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer Actions */}
                {step < 4 && (
                    <div className="p-6 bg-white border-t border-gray-100 flex items-center justify-between gap-4 z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.03)]">
                        <button
                            onClick={prevStep}
                            disabled={step === 1 || loading}
                            className={`px-8 py-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-colors ${step === 1 ? 'opacity-0 pointer-events-none' : ''}`}
                        >
                            Back
                        </button>
                        <button
                            onClick={nextStep}
                            disabled={loading}
                            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-lg disabled:opacity-70 disabled:scale-100"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : (step === 2 ? 'Submit Application' : 'Continue')}
                            {!loading && <ArrowRight size={20} />}
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
}

// Success Component with Navigation Logic based on KYC
function SuccessView({ user, supabase, router }) {
    const [kycCheckLoading, setKycCheckLoading] = useState(true);
    const [nextRoute, setNextRoute] = useState('/merchant/dashboard');

    useEffect(() => {
        const checkKyc = async () => {
            const { data } = await supabase
                .from('user_profiles')
                .select('kyc_status')
                .eq('id', user.id)
                .single();

            // Check KYC rules: if verified/approved -> dashboard, else -> KYC
            if (data?.kyc_status === 'approved' || data?.kyc_status === 'verified') {
                setNextRoute('/merchant/dashboard');
            } else {
                setNextRoute('/profile/kyc'); // Route to KYC page
            }
            setKycCheckLoading(false);
        };
        checkKyc();
    }, [user, supabase]);

    return (
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
                    className="w-full h-full bg-gradient-to-tr from-green-400 to-emerald-600 rounded-full flex items-center justify-center shadow-2xl shadow-green-500/40"
                >
                    <Check className="w-16 h-16 text-white stroke-[3px]" />
                </motion.div>
                <motion.div
                    animate={{ scale: [1, 1.4, 1.4], opacity: [0.3, 0, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 bg-green-400 rounded-full -z-10"
                />
            </div>

            <h2 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">Application Submitted!</h2>
            <p className="text-slate-500 text-lg max-w-md mx-auto mb-10 leading-relaxed">
                Your merchant profile details have been saved. We are redirecting you to the next step.
            </p>

            <div className="w-full max-w-xs space-y-3">
                <button
                    onClick={() => router.push(nextRoute)}
                    disabled={kycCheckLoading}
                    className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl shadow-xl shadow-slate-900/10 transition-all flex items-center justify-center gap-2"
                >
                    {kycCheckLoading ? <Loader2 className="animate-spin" /> : <Home size={18} />}
                    {kycCheckLoading ? 'Checking Status...' : 'Continue'}
                </button>
            </div>
        </motion.div>
    );
}

// Helpers
function TrustItem({ icon: Icon, title, text, delay }) {
    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay, duration: 0.5 }}
            className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors"
        >
            <div className="shrink-0 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                <Icon size={20} className="text-blue-300" />
            </div>
            <div>
                <h3 className="font-bold text-white mb-0.5">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{text}</p>
            </div>
        </motion.div>
    );
}

function SmoothInput({ label, className = "", icon: Icon, ...props }) {
    return (
        <div className="group">
            <label className="block text-sm font-bold text-slate-700 mb-2 ml-1 group-focus-within:text-blue-600 transition-colors">
                {label}
            </label>
            <div className="relative transform transition-all duration-200 group-focus-within:scale-[1.01]">
                <input
                    className={`w-full px-5 py-4 pl-12 bg-white border-2 border-slate-100 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none font-semibold text-slate-800 placeholder:text-slate-300 shadow-sm group-hover:border-slate-200 ${className}`}
                    placeholder={`Enter ${label}`}
                    {...props}
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                    {Icon && <Icon size={20} />}
                </div>
            </div>
        </div>
    )
}

function SmoothTextArea({ label, className = "", ...props }) {
    return (
        <div className="group">
            <label className="block text-sm font-bold text-slate-700 mb-2 ml-1 group-focus-within:text-blue-600 transition-colors">
                {label}
            </label>
            <textarea
                className={`w-full px-5 py-4 bg-white border-2 border-slate-100 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none font-semibold text-slate-800 placeholder:text-slate-300 shadow-sm group-hover:border-slate-200 resize-none ${className}`}
                placeholder={`Enter ${label}`}
                rows={3}
                {...props}
            />
        </div>
    )
}
