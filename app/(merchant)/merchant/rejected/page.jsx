'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { XCircle, Mail, Home, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function MerchantRejectedPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [rejectionReason, setRejectionReason] = useState('');
    const [rejectedAt, setRejectedAt] = useState(null);

    useEffect(() => {
        fetchRejectionDetails();
    }, []);

    const fetchRejectionDetails = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: merchant } = await supabase
                .from('merchants')
                .select('rejection_reason, rejected_at')
                .eq('user_id', user.id)
                .single();

            if (merchant) {
                setRejectionReason(merchant.rejection_reason || 'No specific reason provided');
                setRejectedAt(merchant.rejected_at);
            }
        } catch (error) {
            console.error('Error fetching rejection details:', error);
        } finally {
            setLoading(false);
        }
    };

    const canReapply = () => {
        if (!rejectedAt) return false;
        const rejectionDate = new Date(rejectedAt);
        const daysSinceRejection = (Date.now() - rejectionDate.getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceRejection >= 30;
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#92BCEA]" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
                {/* Header */}
                <div className="bg-gradient-to-br from-red-500 to-rose-500 p-8 sm:p-12 text-white text-center">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                        className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center"
                    >
                        <XCircle className="w-10 h-10 sm:w-12 sm:h-12" />
                    </motion.div>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-3">Application Not Approved</h1>
                    <p className="text-white/90 text-lg">Your merchant application was not approved</p>
                </div>

                {/* Content */}
                <div className="p-8 sm:p-12">
                    <div className="mb-8">
                        <div className="p-5 bg-red-50 rounded-2xl border border-red-200">
                            <div className="flex items-start gap-3 mb-3">
                                <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                                <div>
                                    <h3 className="font-bold text-red-900 mb-2">Reason for Rejection</h3>
                                    <p className="text-red-700 leading-relaxed">{rejectionReason}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-50 rounded-2xl p-6 mb-8">
                        <h3 className="font-bold text-gray-900 mb-4">What can you do?</h3>
                        <ul className="space-y-3 text-gray-700">
                            <li className="flex items-start gap-3">
                                <span className="text-[#92BCEA] font-bold">1.</span>
                                <span>Review the rejection reason carefully</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="text-[#92BCEA] font-bold">2.</span>
                                <span>Prepare the correct documents and information</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="text-[#92BCEA] font-bold">3.</span>
                                <span>Contact support if you need clarification</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="text-[#92BCEA] font-bold">4.</span>
                                <span>Reapply after 30 days from rejection date</span>
                            </li>
                        </ul>
                    </div>

                    {!canReapply() && (
                        <div className="mb-6 p-4 bg-yellow-50 rounded-xl border border-yellow-200 text-center">
                            <p className="text-sm text-yellow-800">
                                You can reapply after <span className="font-bold">30 days</span> from the rejection date
                            </p>
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3">
                        {canReapply() ? (
                            <button
                                onClick={() => router.push('/merchant-apply')}
                                className="flex-1 px-6 py-4 bg-gradient-to-r from-[#92BCEA] to-[#AFB3F7] text-white font-bold rounded-xl hover:shadow-lg transition-all flex items-center justify-center gap-2"
                            >
                                Reapply Now
                                <ArrowRight size={20} />
                            </button>
                        ) : (
                            <button
                                onClick={() => window.location.href = 'mailto:support@intrust.com'}
                                className="flex-1 px-6 py-4 bg-gradient-to-r from-[#92BCEA] to-[#AFB3F7] text-white font-bold rounded-xl hover:shadow-lg transition-all flex items-center justify-center gap-2"
                            >
                                <Mail size={20} />
                                Contact Support
                            </button>
                        )}
                        <button
                            onClick={() => router.push('/')}
                            className="flex-1 px-6 py-4 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
                        >
                            <Home size={20} />
                            Return to Home
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
