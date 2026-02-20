'use client';

import { useRouter } from 'next/navigation';
import { Clock, Mail, Home, ArrowRight } from 'lucide-react';

export default function MerchantPendingPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
            <div
                className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
                {/* Header */}
                <div className="bg-gradient-to-br from-yellow-500 to-orange-500 p-8 sm:p-12 text-white text-center">
                    <div
                        className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transform scale-100"
                    >
                        <Clock className="w-10 h-10 sm:w-12 sm:h-12" />
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-3">Application Under Review</h1>
                    <p className="text-white/90 text-lg">We're reviewing your merchant application</p>
                </div>

                {/* Content */}
                <div className="p-8 sm:p-12">
                    <div className="space-y-6 mb-8">
                        <div className="flex items-start gap-4 p-4 bg-green-50 rounded-xl border border-green-200">
                            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 text-white font-bold">
                                ✓
                            </div>
                            <div>
                                <p className="font-semibold text-green-900">KYC Verified</p>
                                <p className="text-sm text-green-700">Your identity has been verified successfully</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4 p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                            <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center flex-shrink-0">
                                <Clock className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <p className="font-semibold text-yellow-900">Merchant Application Pending</p>
                                <p className="text-sm text-yellow-700">Our team is reviewing your business details</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-50 rounded-2xl p-6 mb-8">
                        <h3 className="font-bold text-gray-900 mb-4">What happens next?</h3>
                        <ul className="space-y-3 text-gray-700">
                            <li className="flex items-start gap-3">
                                <span className="text-[#92BCEA] font-bold">1.</span>
                                <span>Our team will verify your business details and documents</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="text-[#92BCEA] font-bold">2.</span>
                                <span>You'll receive an email notification once approved</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="text-[#92BCEA] font-bold">3.</span>
                                <span>Access to the merchant panel will be granted immediately</span>
                            </li>
                        </ul>
                    </div>

                    <div className="text-center mb-6">
                        <p className="text-sm text-gray-600 mb-2">
                            <Mail className="inline w-4 h-4 mr-1" />
                            Estimated approval time: <span className="font-bold text-gray-900">1-2 business days</span>
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            onClick={() => router.push('/')}
                            className="flex-1 px-6 py-4 bg-gradient-to-r from-[#92BCEA] to-[#AFB3F7] text-white font-bold rounded-xl hover:shadow-lg transition-all flex items-center justify-center gap-2"
                        >
                            <Home size={20} />
                            Return to Home
                        </button>
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="flex-1 px-6 py-4 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
                        >
                            Customer Dashboard
                            <ArrowRight size={20} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
