'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { ChevronLeft, TableProperties, Upload, CheckCircle2, XCircle, AlertTriangle, Lock } from 'lucide-react';
import Link from 'next/link';
import BulkProductTable from './BulkProductTable';
import BulkCSVUploader from './BulkCSVUploader';

export default function BulkProductPage({ merchantId, isSubscribed = true }) {
    const [activeTab, setActiveTab] = useState('table');
    const [categories, setCategories] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [results, setResults] = useState(null); // null | { items: [{index, title, success, error}] }

    useEffect(() => {
        supabase
            .from('shopping_categories')
            .select('name')
            .eq('is_active', true)
            .order('display_order', { ascending: true })
            .then(({ data }) => {
                if (data) setCategories(data.map(c => c.name));
            });
    }, []);

    const handleSubmit = async (products) => {
        if (!isSubscribed) {
            toast.error('An active subscription is required to submit products.');
            return;
        }
        setSubmitting(true);
        setResults(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/merchant/shopping/bulk-submit-products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
                body: JSON.stringify({ merchantId, products }),
            });
            const json = await res.json();
            if (!res.ok && res.status === 402) {
                toast.error('Subscription required. Please subscribe to use this feature.');
                return;
            }
            if (!res.ok && !json.results) throw new Error(json.error || 'Submission failed');
            const results = json.results;
            setResults(results);
            const successCount = results.filter(r => r.success).length;
            const failCount = results.length - successCount;
            if (failCount === 0) {
                toast.success(`All ${successCount} products submitted for approval!`);
            } else if (successCount === 0) {
                toast.error(`All ${failCount} products had validation errors. See details below.`);
            } else {
                toast.error(`${successCount} submitted, ${failCount} failed. See details below.`);
            }
        } catch (err) {
            toast.error(err.message || 'Failed to submit products');
        } finally {
            setSubmitting(false);
        }
    };

    const tabs = [
        { id: 'table', label: 'Add Rows', icon: TableProperties },
        { id: 'csv', label: 'Upload CSV', icon: Upload },
    ];

    return (
        <div className="p-4 sm:p-6 lg:p-10 max-w-6xl mx-auto space-y-8">
            {/* Back */}
            <Link
                href="/merchant/shopping/inventory"
                className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-900 font-black text-[10px] uppercase tracking-widest transition-colors"
            >
                <ChevronLeft size={16} /> Back to Shop
            </Link>

            {/* Header */}
            <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-50 text-purple-600 text-[10px] font-black uppercase tracking-widest">
                    <TableProperties size={12} /> Bulk Operation
                </div>
                <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-none">
                    Bulk Add <span className="text-[#1e3a5f]">Products</span>
                </h1>
                <p className="text-slate-400 font-medium text-sm max-w-lg">
                    Add multiple custom products at once. Each will be submitted for admin approval before going live.
                </p>
            </div>

            {/* How it works banner */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                    { step: '01', title: 'Fill Details', desc: 'Enter or upload products with pricing and stock.' },
                    { step: '02', title: 'Submit for Review', desc: 'All products go to admin for approval.' },
                    { step: '03', title: 'Go Live', desc: 'Approved products appear in your shop.' },
                ].map(s => (
                    <div key={s.step} className="flex items-start gap-3 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                        <span className="text-2xl font-black text-slate-100 leading-none select-none">{s.step}</span>
                        <div>
                            <p className="font-black text-slate-800 text-sm">{s.title}</p>
                            <p className="text-slate-500 text-xs mt-0.5 font-medium">{s.desc}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Subscription gate banner */}
            {!isSubscribed && (
                <div className="flex items-center gap-4 p-5 bg-amber-50 border border-amber-200 rounded-2xl">
                    <div className="w-11 h-11 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                        <Lock size={20} />
                    </div>
                    <div className="flex-1">
                        <p className="font-black text-amber-800 text-sm">Active subscription required</p>
                        <p className="text-amber-700 text-xs font-medium mt-0.5">
                            You need an active subscription to bulk-add products. Please subscribe or renew to unlock this feature.
                        </p>
                    </div>
                    <Link
                        href="/merchant/subscription"
                        className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-amber-600 text-white text-[11px] font-black uppercase tracking-widest hover:bg-amber-700 transition-all shadow-md shrink-0"
                    >
                        Subscribe
                    </Link>
                </div>
            )}

            {/* Tab switcher */}
            <div className={`flex items-center p-1 bg-white rounded-2xl border border-slate-200 shadow-sm w-fit ${!isSubscribed ? 'opacity-50 pointer-events-none' : ''}`}>
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => { setActiveTab(tab.id); setResults(null); }}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab.id
                                ? 'bg-[#1e3a5f] text-white shadow-lg shadow-blue-900/20'
                                : 'text-slate-500 hover:text-slate-900'
                                }`}
                        >
                            <Icon size={14} /> {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Tab Content */}
            <div className={`bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 sm:p-8 ${!isSubscribed ? 'opacity-50 pointer-events-none' : ''}`}>
                {activeTab === 'table' ? (
                    <BulkProductTable categories={categories} onSubmit={handleSubmit} submitting={submitting} />
                ) : (
                    <BulkCSVUploader categories={categories} onSubmit={handleSubmit} submitting={submitting} />
                )}
            </div>

            {/* Results Panel */}
            {results && (
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 sm:p-8 space-y-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                            <CheckCircle2 size={20} />
                        </div>
                        <div>
                            <h3 className="font-black text-slate-900 text-lg">Submission Results</h3>
                            <p className="text-slate-500 text-xs font-bold mt-0.5 uppercase tracking-widest">
                                {results.filter(r => r.success).length} of {results.length} succeeded
                            </p>
                        </div>
                    </div>
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                        {results.map((r, i) => (
                            <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm ${r.success ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                                {r.success
                                    ? <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                                    : <XCircle size={15} className="text-red-500 shrink-0" />
                                }
                                <span className={`font-black flex-1 truncate ${r.success ? 'text-emerald-800' : 'text-red-800'}`}>{r.title || `Product ${i + 1}`}</span>
                                {!r.success && <span className="text-red-600 text-xs font-bold shrink-0">{r.error}</span>}
                                {r.success && <span className="text-emerald-600 text-[9px] font-black uppercase tracking-widest shrink-0">Pending Approval</span>}
                            </div>
                        ))}
                    </div>
                    <Link
                        href="/merchant/shopping/inventory"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#1e3a5f] text-white font-black text-[11px] uppercase tracking-widest hover:bg-[#2c5282] transition-all shadow-lg"
                    >
                        Go to Inventory →
                    </Link>
                </div>
            )}
        </div>
    );
}
