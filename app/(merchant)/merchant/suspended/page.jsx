'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { ShieldAlert, Mail, Home, AlertCircle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function MerchantSuspendedPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [suspensionReason, setSuspensionReason] = useState('');

    useEffect(() => {
        fetchSuspensionDetails();
    }, []);

    const fetchSuspensionDetails = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: merchant } = await supabase
                .from('merchants')
                .select('suspension_reason')
                .eq('user_id', user.id)
                .single();

            if (merchant) {
                setSuspensionReason(merchant.suspension_reason || 'No specific reason provided');
            }
        } catch (error) {
            console.error('Error fetching suspension details:', error);
        } finally {
            setLoading(false);
        }
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
                <div className="bg-gradient-to-br from-orange-500 to-red-500 p-8 sm:p-12 text-white text-center">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                        className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center"
                    >
                        <ShieldAlert className="w-10 h-10 sm:w-12 sm:h-12" />
                    </motion.div>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-3">Account Suspended</h1>
                    <p className="text-white/90 text-lg">Your merchant account has been temporarily suspended</p>
                </div>

                {/* Content */}
                <div className="p-8 sm:p-12">
                    <div className="mb-8">
                        <div className="p-5 bg-orange-50 rounded-2xl border border-orange-200">
                            <div className="flex items-start gap-3 mb-3">
                                <AlertCircle className="text-orange-600 flex-shrink-0 mt-0.5" size={20} />
                                <div>
                                    <h3 className="font-bold text-orange-900 mb-2">Reason for Suspension</h3>
                                    <p className="text-orange-700 leading-relaxed">{suspensionReason}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-50 rounded-2xl p-6 mb-8">
                        <h3 className="font-bold text-gray-900 mb-4">What does this mean?</h3>
                        <ul className="space-y-3 text-gray-700">
                            <li className="flex items-start gap-3">
                                <span className="text-orange-500 font-bold">•</span>
                                <span>You cannot access the merchant panel until the issue is resolved</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="text-orange-500 font-bold">•</span>
                                <span>Your listed coupons have been temporarily removed from the marketplace</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="text-orange-500 font-bold">•</span>
                                <span>Your wallet balance is safe and will remain intact</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="text-orange-500 font-bold">•</span>
                                <span>Contact our support team to resolve this issue</span>
                            </li>
                        </ul>
                    </div>

                    <div className="bg-blue-50 rounded-2xl p-6 mb-8 border border-blue-200">
                        <h3 className="font-bold text-blue-900 mb-3">Need Help?</h3>
                        <p className="text-blue-700 mb-4">
                            Our support team is here to help you resolve this issue. Please reach out to us with your account details.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-2 text-sm">
                            <div className="flex items-center gap-2 text-blue-800">
                                <Mail size={16} />
                                <span className="font-semibold">support@intrust.com</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            onClick={() => window.location.href = 'mailto:support@intrust.com?subject=Merchant Account Suspended'}
                            className="flex-1 px-6 py-4 bg-gradient-to-r from-[#92BCEA] to-[#AFB3F7] text-white font-bold rounded-xl hover:shadow-lg transition-all flex items-center justify-center gap-2"
                        >
                            <Mail size={20} />
                            Contact Support
                        </button>
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
