import { motion, AnimatePresence } from 'framer-motion';
import { X, Filter, CheckCircle2 } from 'lucide-react';

const STATUSES = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'];
const TEMPERATURES = ['hot', 'warm', 'cold'];

export default function LeadFilterDrawer({ 
    isOpen, 
    onClose, 
    statusFilter, 
    tempFilter, 
    assigneeFilter, 
    reps, 
    isManager, 
    updateParams,
    activeFilterCount
}) {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]"
                    />

                    {/* Drawer */}
                    <motion.div 
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed inset-x-0 bottom-[72px] max-h-[80vh] sm:bottom-0 sm:max-h-none sm:h-auto sm:inset-y-0 sm:right-0 sm:left-auto sm:w-96 bg-white shadow-[0_-10px_40px_rgba(0,0,0,0.1)] sm:shadow-2xl z-[101] flex flex-col font-[family-name:var(--font-outfit)] rounded-t-[2rem] sm:rounded-none overflow-hidden"
                    >
                        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                                    <Filter size={20} />
                                </div>
                                <h2 className="text-xl font-black text-slate-900 tracking-tight">Advanced Filters</h2>
                            </div>
                            <button 
                                onClick={onClose}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-8">
                            
                            {/* Status Filter */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Status</h3>
                                <div className="flex flex-wrap gap-2">
                                    {STATUSES.map(s => {
                                        const isSelected = statusFilter.includes(s);
                                        return (
                                            <button
                                                key={s}
                                                onClick={() => {
                                                    const newStatus = isSelected 
                                                        ? statusFilter.filter(x => x !== s) 
                                                        : [...statusFilter, s];
                                                    updateParams({ status: newStatus }, true);
                                                }}
                                                className={`px-4 py-2.5 rounded-2xl text-sm font-bold transition-all flex items-center gap-2 border shadow-sm ${
                                                    isSelected 
                                                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-indigo-100/50' 
                                                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                                                }`}
                                            >
                                                {isSelected && <CheckCircle2 size={14} className="text-indigo-600" />}
                                                <span className="capitalize">{s}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Temperature Filter */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Temperature</h3>
                                <div className="flex flex-wrap gap-2">
                                    {TEMPERATURES.map(t => {
                                        const isSelected = tempFilter.includes(t);
                                        const colors = {
                                            hot: 'text-rose-600 bg-rose-50 border-rose-200',
                                            warm: 'text-amber-600 bg-amber-50 border-amber-200',
                                            cold: 'text-sky-600 bg-sky-50 border-sky-200'
                                        };
                                        return (
                                            <button
                                                key={t}
                                                onClick={() => {
                                                    const newTemp = isSelected 
                                                        ? tempFilter.filter(x => x !== t) 
                                                        : [...tempFilter, t];
                                                    updateParams({ temperature: newTemp }, true);
                                                }}
                                                className={`px-4 py-2.5 rounded-2xl text-sm font-bold transition-all flex items-center gap-2 border shadow-sm ${
                                                    isSelected 
                                                        ? colors[t]
                                                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                                                }`}
                                            >
                                                {isSelected && <CheckCircle2 size={14} />}
                                                <span className="capitalize">{t}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Assignee Filter */}
                            {isManager && (
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Assignee</h3>
                                    <div className="relative">
                                        <select 
                                            value={assigneeFilter[0] || ''}
                                            onChange={(e) => updateParams({ assignee: e.target.value ? [e.target.value] : [] }, true)}
                                            className="w-full appearance-none pl-4 pr-10 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                                        >
                                            <option value="">All Reps</option>
                                            <option value="unassigned">Unassigned</option>
                                            <option value="me">Assigned to me</option>
                                            {reps.map(r => <option key={r.id} value={r.id}>{r.full_name}</option>)}
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>

                        {/* Footer */}
                        <div className="p-4 sm:p-6 border-t border-gray-100 bg-gray-50 flex gap-3 mt-auto">
                            <button 
                                onClick={() => {
                                    updateParams({ status: [], temperature: [], assignee: [] }, true);
                                }}
                                className="flex-1 py-3.5 px-4 bg-white border border-slate-200 rounded-2xl text-sm font-black text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
                            >
                                Clear All
                            </button>
                            <button 
                                onClick={onClose}
                                className="flex-1 py-3.5 px-4 bg-indigo-600 text-white rounded-2xl text-sm font-black hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                            >
                                Show Results
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
