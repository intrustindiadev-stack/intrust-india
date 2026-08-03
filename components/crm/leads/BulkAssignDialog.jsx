'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Users, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function BulkAssignDialog({ 
    isOpen, 
    onClose, 
    selectedCount, 
    totalMatchingCount,
    selectAllMatching,
    reps, 
    onConfirm 
}) {
    const [selectedRep, setSelectedRep] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const targetCount = selectAllMatching ? totalMatchingCount : selectedCount;

    const handleConfirm = async () => {
        setIsSubmitting(true);
        try {
            await onConfirm(selectedRep === 'unassigned' ? null : selectedRep);
            toast.success('Assignment updated successfully!');
            onClose();
        } catch (error) {
            toast.error(error.message || 'Failed to update assignment');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={!isSubmitting ? onClose : undefined}
            />
            <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col"
                role="dialog"
                aria-modal="true"
                aria-labelledby="bulk-assign-title"
            >
                {/* Header */}
                <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <Users size={20} />
                        </div>
                        <div>
                            <h2 id="bulk-assign-title" className="text-lg font-bold text-gray-900">Assign Leads</h2>
                            <p className="text-xs text-gray-500 font-medium">Assigning {targetCount} lead{targetCount !== 1 ? 's' : ''}</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        disabled={isSubmitting}
                        className="p-2 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50"
                        aria-label="Close dialog"
                    >
                        <X size={18} className="text-gray-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5">
                    {selectAllMatching && (
                        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-3 text-amber-800 text-sm">
                            <AlertCircle size={18} className="shrink-0 mt-0.5" />
                            <p>
                                <strong>Warning:</strong> You are about to reassign <strong>all {totalMatchingCount} leads</strong> matching your current filters. This cannot be easily undone.
                            </p>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">
                            Select Representative
                        </label>
                        <div className="relative">
                            <select
                                value={selectedRep}
                                onChange={(e) => setSelectedRep(e.target.value)}
                                disabled={isSubmitting}
                                className="w-full appearance-none bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block p-3 pr-10 outline-none font-medium transition-all"
                            >
                                <option value="" disabled>Choose a representative...</option>
                                <option value="unassigned">— Unassigned —</option>
                                {reps.map(rep => (
                                    <option key={rep.id} value={rep.id}>
                                        {rep.full_name || rep.email} ({rep.role.replace('_', ' ')})
                                    </option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-gray-100 bg-gray-50/50 flex gap-3">
                    <button
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 font-semibold text-sm hover:bg-gray-50 disabled:opacity-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={isSubmitting || !selectedRep}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors shadow-sm shadow-indigo-600/20"
                    >
                        {isSubmitting ? (
                            <><Loader2 size={16} className="animate-spin" /> Processing...</>
                        ) : (
                            'Confirm Assignment'
                        )}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
