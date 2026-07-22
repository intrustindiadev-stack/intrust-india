'use client';

import { useState } from 'react';
import { X, CheckCircle, XCircle, Calendar, User, FileText, Loader2, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function LeaveActionModal({ leave, isOpen, onClose, onActionSuccess }) {
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);

    if (!isOpen || !leave) return null;

    const handleUpdateStatus = async (newStatus) => {
        setSubmitting(true);
        try {
            const { data, error } = await supabase
                .from('leave_requests')
                .update({
                    status: newStatus,
                    reviewer_comment: comment,
                    updated_at: new Date().toISOString()
                })
                .eq('id', leave.id)
                .select()
                .single();

            if (error) throw error;

            toast.success(`Leave request ${newStatus === 'approved' ? 'Approved' : 'Rejected'} successfully!`);
            if (onActionSuccess) onActionSuccess(data || { ...leave, status: newStatus });
            onClose();
        } catch (err) {
            console.error('Error updating leave status:', err);
            toast.error(err.message || 'Failed to update leave request');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white dark:bg-gray-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-800 space-y-6 relative overflow-hidden font-[family-name:var(--font-outfit)]"
                >
                    <div className="flex justify-between items-center pb-4 border-b border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                                <Calendar size={20} />
                            </div>
                            <div>
                                <h3 className="font-extrabold text-lg text-gray-900 dark:text-white">Review Leave Request</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Supervisor approval workflow</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
                            <X size={18} />
                        </button>
                    </div>

                    <div className="p-4 bg-gray-50 dark:bg-gray-950 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-3">
                        <div className="flex justify-between items-start">
                            <div>
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Applicant</span>
                                <h4 className="font-extrabold text-gray-900 dark:text-white text-base mt-0.5">{leave.employee_name || leave.user_profiles?.full_name || 'Employee'}</h4>
                            </div>
                            <span className="px-3 py-1 bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 text-xs font-black rounded-lg capitalize">
                                {leave.leave_type || 'Leave'}
                            </span>
                        </div>

                        <div className="pt-2 grid grid-cols-2 gap-2 text-xs border-t border-gray-200/60 dark:border-gray-800">
                            <div>
                                <span className="text-gray-400 uppercase tracking-wider font-bold text-[10px]">From</span>
                                <p className="font-bold text-gray-800 dark:text-gray-200 mt-0.5">{leave.from_date || leave.start_date}</p>
                            </div>
                            <div>
                                <span className="text-gray-400 uppercase tracking-wider font-bold text-[10px]">To</span>
                                <p className="font-bold text-gray-800 dark:text-gray-200 mt-0.5">{leave.to_date || leave.end_date}</p>
                            </div>
                        </div>

                        {leave.reason && (
                            <div className="pt-2 border-t border-gray-200/60 dark:border-gray-800">
                                <span className="text-gray-400 uppercase tracking-wider font-bold text-[10px]">Reason Statement</span>
                                <p className="text-xs text-gray-600 dark:text-gray-300 font-medium mt-0.5 italic">&quot;{leave.reason}&quot;</p>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Supervisor Remarks (Optional)</label>
                        <input
                            type="text"
                            value={comment}
                            onChange={e => setComment(e.target.value)}
                            placeholder="e.g. Approved. Please hand over active tasks..."
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-950 text-gray-900 dark:text-white font-semibold text-sm outline-none focus:border-amber-500"
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            disabled={submitting}
                            onClick={() => handleUpdateStatus('rejected')}
                            className="flex-1 py-3.5 bg-rose-500 hover:bg-rose-600 text-white font-black rounded-2xl shadow-lg shadow-rose-500/20 text-sm flex items-center justify-center gap-2 transition-all"
                        >
                            {submitting ? <Loader2 className="animate-spin" size={16} /> : <XCircle size={18} />}
                            Reject Request
                        </button>
                        <button
                            type="button"
                            disabled={submitting}
                            onClick={() => handleUpdateStatus('approved')}
                            className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-lg shadow-emerald-600/20 text-sm flex items-center justify-center gap-2 transition-all"
                        >
                            {submitting ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle size={18} />}
                            Approve Leave
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
