'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, CheckCircle, XCircle, Clock } from 'lucide-react';
import KYCModal from '@/components/admin/KYCModal';

export default function KYCReviewSection({ kyc_records, userKycStatus }) {
    const [showKYCModal, setShowKYCModal] = useState(false);
    const [selectedKYC, setSelectedKYC] = useState(null);
    const router = useRouter();

    const handleReviewClick = () => {
        if (kyc_records && kyc_records.length > 0) {
            const pendingRecord = kyc_records.find(r => (r.verification_status || r.status) === 'pending') || kyc_records[0];
            setSelectedKYC(pendingRecord);
            setShowKYCModal(true);
        }
    };

    const handleReviewRecord = (record) => {
        setSelectedKYC(record);
        setShowKYCModal(true);
    };

    const handleModalClose = (actionTaken = false) => {
        setShowKYCModal(false);
        setSelectedKYC(null);
        if (actionTaken) {
            router.refresh(); // Refresh data on close only if action was taken
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'verified': return <span className="flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold uppercase"><CheckCircle size={14} /> Verified</span>;
            case 'pending':
                return <span className="flex items-center gap-1 bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-bold uppercase"><Clock size={14} /> Pending</span>;
            case 'rejected':
                return <span className="flex items-center gap-1 bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold uppercase"><XCircle size={14} /> Rejected</span>;
            default:
                return <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-bold uppercase">Unknown</span>;
        }
    };

    return (
        <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2 tracking-tight">
                    <Shield className="text-indigo-600" />
                    KYC Verification
                </h2>
                {kyc_records?.some(r => (r.verification_status || r.status) === 'pending') && (
                    <button
                        onClick={handleReviewClick}
                        className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors"
                    >
                        Review Application
                    </button>
                )}
            </div>

            {kyc_records && kyc_records.length > 0 ? (
                <div className="space-y-4">
                    {kyc_records.map((record) => (
                        <div key={record.id} className="bg-gray-50 rounded-2xl p-5 border border-gray-100 hover:border-indigo-100 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                                <span className="font-bold text-gray-900 capitalize text-lg tracking-tight">
                                    {(record.document_type || record.id_type || 'Unknown').replace('_', ' ')}
                                </span>
                                <div className="flex items-center gap-3">
                                    {getStatusBadge(record.status || record.verification_status)}
                                    {(record.verification_status || record.status) === 'pending' ? (
                                        <button
                                            onClick={() => handleReviewRecord(record)}
                                            className="px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg hover:bg-indigo-200 transition-colors"
                                        >
                                            Review
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleReviewRecord(record)}
                                            className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-200 transition-colors"
                                        >
                                            View Details
                                        </button>
                                    )}
                                </div>
                            </div>
                            <p className="text-sm font-medium text-gray-600 mb-3">
                                Document Number: <span className="font-mono bg-white px-2 py-1 rounded border border-gray-200 ml-2">{record.document_number || record.pan_number || record.id_number_encrypted || '-'}</span>
                            </p>
                            {record.rejection_reason && (
                                <div className="mt-2 mb-3 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                                    <span className="font-bold">Reason:</span> {record.rejection_reason}
                                </div>
                            )}
                            {record.front_image_url && (
                                <div className="mt-4">
                                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Document Image</p>
                                    <a href={record.front_image_url} target="_blank" rel="noopener noreferrer" className="block w-full h-40 bg-gray-200 rounded-xl overflow-hidden relative group">
                                        <img src={record.front_image_url} alt="Document" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-indigo-900/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white font-bold text-sm backdrop-blur-sm">
                                            Open Full Size Details
                                        </div>
                                    </a>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                    <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">No KYC records found for this user.</p>
                </div>
            )}

            {showKYCModal && selectedKYC && (
                <KYCModal
                    kyc={selectedKYC}
                    onClose={handleModalClose}
                />
            )}
        </div>
    );
}
