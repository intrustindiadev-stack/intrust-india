'use client';

import { useState, useEffect, useCallback } from 'react';
import { PlayCircle, FileText, RefreshCw, BookOpen, Layers, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/contexts/AuthContext';
import { motion } from 'framer-motion';

const TYPE_ICON = {
    video: PlayCircle,
    document: FileText,
    interactive: Layers,
};

const TYPE_COLOR = {
    video: 'bg-gradient-to-br from-violet-500 to-purple-600',
    document: 'bg-gradient-to-br from-amber-400 to-orange-500',
    interactive: 'bg-gradient-to-br from-blue-500 to-cyan-600',
};

export default function EmployeeTrainingPage() {
    const { user } = useAuth();
    const [modules, setModules] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchModules = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('training_materials')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            setModules(data || []);
        } catch (err) {
            console.error('Training fetch error:', err);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => { fetchModules(); }, [fetchModules]);

    const staticFallback = [
        { id: 's1', title: 'Company Security Policies', content_type: 'video', description: 'Learn about our security protocols and best practices.', is_mandatory: true, category: 'Compliance' },
        { id: 's2', title: 'Sales Pitch Guidelines', content_type: 'document', description: 'Master the art of pitching to prospective clients.', is_mandatory: false, category: 'Sales' },
        { id: 's3', title: 'Anti-Harassment Training 2026', content_type: 'interactive', description: 'Mandatory annual compliance training for all employees.', is_mandatory: true, category: 'Compliance' },
    ];

    const displayModules = modules.length > 0 ? modules : (isLoading ? [] : staticFallback);

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Training Hub</h1>
                    <p className="text-sm text-gray-500 mt-1">Complete your assigned training modules to grow your skills.</p>
                </div>
                <button onClick={fetchModules} className="p-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors">
                    <RefreshCw size={16} className="text-gray-500" />
                </button>
            </div>

            {/* Overview strip */}
            {displayModules.length > 0 && (
                <div className="flex gap-4 flex-wrap">
                    <div className="flex items-center gap-3 bg-gradient-to-br from-violet-600 to-purple-700 rounded-2xl px-5 py-3 text-white shadow-lg shadow-violet-500/20">
                        <BookOpen size={20} />
                        <div>
                            <p className="text-xs text-white/70 font-medium">Total Modules</p>
                            <p className="text-xl font-black">{displayModules.length}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl px-5 py-3 text-white shadow-lg shadow-rose-500/20">
                        <AlertCircle size={20} />
                        <div>
                            <p className="text-xs text-white/70 font-medium">Mandatory</p>
                            <p className="text-xl font-black">{displayModules.filter(m => m.is_mandatory).length}</p>
                        </div>
                    </div>
                </div>
            )}

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(3)].map((_, i) => <div key={i} className="h-64 bg-white border border-gray-100 rounded-3xl animate-pulse" />)}
                </div>
            ) : displayModules.length === 0 ? (
                <div className="bg-white rounded-3xl border border-gray-100 p-16 text-center shadow-sm">
                    <div className="w-16 h-16 bg-violet-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
                        <BookOpen size={28} className="text-violet-400" />
                    </div>
                    <p className="font-semibold text-gray-700">No training materials yet</p>
                    <p className="text-sm text-gray-400 mt-1">Your HR team will assign modules soon.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {displayModules.map((mod, i) => {
                        const type = mod.content_type?.toLowerCase() || 'document';
                        const Icon = TYPE_ICON[type] || FileText;
                        const gradientClass = TYPE_COLOR[type] || TYPE_COLOR.document;
                        return (
                            <motion.div key={mod.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                                className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all group flex flex-col">
                                <div className={`h-36 flex items-center justify-center relative ${gradientClass}`}>
                                    <div className="absolute inset-0 bg-black/10" />
                                    <Icon size={52} className="text-white/80 z-10 group-hover:scale-110 transition-transform" />
                                    {mod.is_mandatory && (
                                        <span className="absolute top-3 right-3 bg-white/90 text-rose-600 text-xs font-bold px-2 py-1 rounded-lg z-10">
                                            Mandatory
                                        </span>
                                    )}
                                </div>
                                <div className="p-5 flex-1 flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider capitalize">{type}</span>
                                            {mod.category && (
                                                <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">{mod.category}</span>
                                            )}
                                        </div>
                                        <h3 className="text-base font-bold text-gray-900 mb-2 group-hover:text-violet-600 transition-colors">{mod.title}</h3>
                                        {mod.description && <p className="text-sm text-gray-500 line-clamp-2">{mod.description}</p>}
                                    </div>
                                    <div className="mt-4">
                                        {mod.content_url ? (
                                            <a href={mod.content_url} target="_blank" rel="noreferrer"
                                                className="w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white px-4 py-2.5 rounded-xl font-medium transition-colors shadow-md text-sm">
                                                <Icon size={16} />
                                                {type === 'video' ? 'Watch Now' : 'Open Module'}
                                            </a>
                                        ) : (
                                            <div className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-400 px-4 py-2.5 rounded-xl font-medium text-sm cursor-not-allowed">
                                                <FileText size={16} />
                                                Coming Soon
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
