'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Edit2, Trash2, X, Briefcase, MapPin, DollarSign, Activity } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import ConfirmModal from '@/components/ui/ConfirmModal';

const CATEGORY_OPTIONS = [
    { value: 'freelancer', label: 'Freelancer' },
    { value: 'agent', label: 'Field Agent' },
    { value: 'dsa', label: 'DSA Partner' },
    { value: 'sales', label: 'Sales' },
    { value: 'other', label: 'Other' },
];

export default function HRJobsPage() {
    const { user } = useAuth();
    const [jobs, setJobs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingJob, setEditingJob] = useState(null);
    const [pendingDeleteId, setPendingDeleteId] = useState(null);
    const [form, setForm] = useState({
        title: '',
        category: 'sales',
        description: '',
        requirements: '',
        commission_structure: '',
        location: '',
        is_active: true
    });
    const [saving, setSaving] = useState(false);

    const fetchJobs = useCallback(async () => {
        try {
            const { data, error } = await supabase.from('career_job_roles')
                .select('*').order('created_at', { ascending: false });
            if (error) throw error;
            setJobs(data || []);
        } catch (err) { console.error(err); }
        finally { setIsLoading(false); }
    }, []);

    useEffect(() => { fetchJobs(); }, [fetchJobs]);

    const handleOpenModal = (job = null) => {
        if (job) {
            setEditingJob(job);
            setForm({
                title: job.title,
                category: job.category,
                description: job.description || '',
                requirements: job.requirements || '',
                commission_structure: job.commission_structure || '',
                location: job.location || '',
                is_active: job.is_active
            });
        } else {
            setEditingJob(null);
            setForm({
                title: '',
                category: 'sales',
                description: '',
                requirements: '',
                commission_structure: '',
                location: '',
                is_active: true
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = { ...form, created_by: user?.id };
            
            let res;
            if (editingJob) {
                res = await supabase.from('career_job_roles').update(payload).eq('id', editingJob.id).select();
            } else {
                res = await supabase.from('career_job_roles').insert([payload]).select();
            }

            if (res.error) throw res.error;
            
            toast.success(editingJob ? 'Job updated successfully' : 'Job posted successfully');
            fetchJobs();
            setIsModalOpen(false);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (id) => {
        setPendingDeleteId(id);
    };

    const confirmDelete = async () => {
        if (!pendingDeleteId) return;
        try {
            const { error } = await supabase.from('career_job_roles').delete().eq('id', pendingDeleteId);
            if (error) throw error;
            toast.success('Job posting deleted');
            setJobs(jobs.filter(j => j.id !== pendingDeleteId));
            setPendingDeleteId(null);
        } catch (err) {
            toast.error(err.message);
        }
    };

    const cancelDelete = () => {
        setPendingDeleteId(null);
    };

    const pendingJob = pendingDeleteId ? jobs.find(j => j.id === pendingDeleteId) : null;

    const filteredJobs = jobs.filter(j => 
        !search || 
        j.title?.toLowerCase().includes(search.toLowerCase()) || 
        j.category?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Job Postings</h1>
                    <p className="text-gray-500 mt-1">Manage open positions and career opportunities</p>
                </div>
                <button onClick={() => handleOpenModal()} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20 w-full sm:w-auto justify-center">
                    <Plus size={18} /> Post New Job
                </button>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center bg-gray-50/50">
                    <Search size={20} className="text-gray-400 mr-3" />
                    <input type="text" placeholder="Search jobs by title or category..." value={search} onChange={e => setSearch(e.target.value)}
                        className="bg-transparent border-none focus:ring-0 text-sm w-full outline-none" />
                </div>
                
                {isLoading ? (
                    <div className="p-10 text-center text-gray-400">Loading jobs...</div>
                ) : filteredJobs.length === 0 ? (
                    <div className="p-10 text-center text-gray-400 flex flex-col items-center">
                        <Briefcase size={40} className="mb-3 text-gray-300" />
                        <p>No job postings found</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {filteredJobs.map(job => (
                            <div key={job.id} className="p-5 hover:bg-gray-50 transition-colors flex flex-col sm:flex-row justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h3 className="font-bold text-gray-900">{job.title}</h3>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${job.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                                            {job.is_active ? 'Active' : 'Closed'}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
                                        <span className="flex items-center gap-1.5"><Briefcase size={14} className="text-gray-400"/> <span className="capitalize">{job.category}</span></span>
                                        {job.location && <span className="flex items-center gap-1.5"><MapPin size={14} className="text-gray-400"/> {job.location}</span>}
                                        {job.commission_structure && <span className="flex items-center gap-1.5"><DollarSign size={14} className="text-emerald-500"/> {job.commission_structure.split('\n')[0]}</span>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => handleOpenModal(job)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"><Edit2 size={16} /></button>
                                    <button onClick={() => handleDelete(job.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors"><Trash2 size={16} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <ConfirmModal
                isOpen={pendingDeleteId !== null}
                onConfirm={confirmDelete}
                onCancel={cancelDelete}
                title="Delete Job Posting"
                message={`Delete "${pendingJob?.title}"? This cannot be undone.`}
                confirmLabel="Delete"
            />

            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative z-10">
                            
                            <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-100 p-5 flex justify-between items-center z-20">
                                <h2 className="text-xl font-bold text-gray-900">{editingJob ? 'Edit Job Posting' : 'Post New Job'}</h2>
                                <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl"><X size={20} /></button>
                            </div>

                            <form onSubmit={handleSave} className="p-6 space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Job Title</label>
                                        <input required type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})}
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="e.g. Senior Sales Manager" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Category</label>
                                        <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none bg-white">
                                            {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Location</label>
                                        <input type="text" value={form.location} onChange={e => setForm({...form, location: e.target.value})}
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="e.g. Remote, India" />
                                    </div>
                                    <div className="flex items-center pt-8">
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <div className="relative">
                                                <input type="checkbox" className="sr-only peer" checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})} />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                                            </div>
                                            <span className="text-sm font-bold text-gray-700">Active Listing</span>
                                        </label>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Description</label>
                                    <textarea rows={4} value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none resize-none" placeholder="Job description..." />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Requirements</label>
                                    <textarea rows={3} value={form.requirements} onChange={e => setForm({...form, requirements: e.target.value})}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none resize-none" placeholder="List requirements..." />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Commission Structure / Salary</label>
                                    <textarea rows={2} value={form.commission_structure} onChange={e => setForm({...form, commission_structure: e.target.value})}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none resize-none" placeholder="e.g. ₹50k base + 10% commission" />
                                </div>

                                <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors">Cancel</button>
                                    <button type="submit" disabled={saving} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50">
                                        {saving ? 'Saving...' : (editingJob ? 'Save Changes' : 'Post Job')}
                                    </button>
                                </div>
                            </form>

                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
