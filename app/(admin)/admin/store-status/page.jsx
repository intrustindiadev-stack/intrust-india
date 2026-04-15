'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabaseClient';
import { Activity, Search, Store, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { getPlatformStoreSettings, updatePlatformStoreSettings } from './actions';

export default function AdminStoreStatusPage() {
    const supabase = createClient();
    const [merchants, setMerchants] = useState([]);
    const [platformStore, setPlatformStore] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchMerchants();

        // Real-time synchronization for the list
        const channel = supabase
            .channel('admin_merchants_sync')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'merchants' }, (payload) => {
                if (payload.new) {
                    setMerchants(prev => prev.map(m => m.id === payload.new.id ? { ...m, is_open: payload.new.is_open } : m));
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const fetchMerchants = async () => {
        setLoading(true);
        const pData = await getPlatformStoreSettings();
        if (pData?.value) {
            setPlatformStore(pData.value);
        } else {
            setPlatformStore({ is_open: true });
        }

        const { data, error } = await supabase
            .from('merchants')
            .select('id, business_name, is_open, status')
            .eq('status', 'approved')
            .order('business_name', { ascending: true });

        if (!error && data) {
            setMerchants(data);
        }
        setLoading(false);
    };

    const handleToggle = async (merchantId, newIsOpen) => {
        const { error } = await supabase
            .from('merchants')
            .update({ is_open: newIsOpen })
            .eq('id', merchantId);

        if (!error) {
            setMerchants(prev => prev.map(m => m.id === merchantId ? { ...m, is_open: newIsOpen } : m));
            toast.success('Store status updated');
        } else {
            toast.error('Failed to update status');
        }
    };

    const handlePlatformToggle = async (newIsOpen) => {
        const newSettings = { ...(platformStore || {}), is_open: newIsOpen };
        setPlatformStore(newSettings);
        const { success, error } = await updatePlatformStoreSettings(newSettings);
        if (success) toast.success('Platform status updated');
        else toast.error('Failed to update platform status');
    };

    const filteredMerchants = merchants.filter(m => m.business_name?.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                    <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                        <Activity size={24} />
                    </div>
                    Store Status Management
                </h1>
                <p className="text-slate-500 font-medium text-sm mt-1 ml-14">
                    Toggle any merchant open or closed. Changes reflect in real-time across the platform.
                </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="relative w-full sm:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search merchants..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                    </div>
                </div>

                <div className="overflow-hidden">
                    {loading ? (
                        <div className="p-12 flex flex-col items-center justify-center gap-3 text-slate-400">
                            <Loader2 className="animate-spin" size={32} />
                            <span className="text-sm font-bold tracking-widest uppercase">Loading stores...</span>
                        </div>
                    ) : (
                        <div className="bg-white">
                            {/* Platform Store Row */}
                            {platformStore && (
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 md:px-6 border-b-[3px] border-slate-200 bg-blue-50/30">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black shadow-lg shrink-0 text-xl">
                                            <Store size={22} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-black text-slate-900 text-base tracking-tight">Intrust Official</span>
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600">Platform Store</span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex flex-row items-center justify-between md:justify-end gap-3 sm:gap-6 w-full md:w-auto mt-2 md:mt-0 pt-3 border-t border-blue-200/50 md:pt-0 md:border-t-0">
                                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                            <input 
                                                type="checkbox" 
                                                className="sr-only peer" 
                                                checked={platformStore.is_open ?? true} 
                                                onChange={e => handlePlatformToggle(e.target.checked)} 
                                            />
                                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 shadow-inner"></div>
                                            <span className={`ml-3 text-xs font-bold uppercase tracking-widest min-w-[50px] ${platformStore.is_open ?? true ? 'text-emerald-600' : 'text-slate-500'}`}>
                                                {(platformStore.is_open ?? true) ? 'Open' : 'Closed'}
                                            </span>
                                        </label>
                                    </div>
                                </div>
                            )}

                            {filteredMerchants.length === 0 ? (
                                <div className="p-12 text-center text-slate-500 font-medium text-sm">No merchants found.</div>
                            ) : (
                                filteredMerchants.map(merchant => (
                                    <div key={merchant.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 md:px-6 border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black shadow-inner shrink-0 text-lg">
                                                {merchant.business_name?.substring(0, 2).toUpperCase() || <Store size={18} />}
                                            </div>
                                            <span className="font-bold text-slate-900 truncate max-w-[200px] sm:max-w-xs">{merchant.business_name}</span>
                                        </div>
                                        
                                        <div className="flex flex-row items-center justify-between md:justify-end gap-3 sm:gap-6 w-full md:w-auto mt-2 md:mt-0 pt-3 border-t border-slate-100 md:pt-0 md:border-t-0">
                                            <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                                <input 
                                                    type="checkbox" 
                                                    className="sr-only peer" 
                                                    checked={merchant.is_open} 
                                                    onChange={e => handleToggle(merchant.id, e.target.checked)} 
                                                />
                                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                                                <span className={`ml-3 text-xs font-bold uppercase tracking-widest min-w-[50px] ${merchant.is_open ? 'text-emerald-600' : 'text-slate-500'}`}>
                                                    {merchant.is_open ? 'Open' : 'Closed'}
                                                </span>
                                            </label>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
