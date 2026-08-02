'use client';

import React, { useState, useMemo } from 'react';
import { Search, RefreshCw, AlertCircle, FileText, X, Wifi, WifiOff } from 'lucide-react';
import { normalizeTemplate } from '@/lib/whatsapp/templateAdapter';
import TemplateCard from './TemplateCard';

function TemplateCardSkeleton() {
    return (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4 animate-pulse">
            <div className="flex justify-between items-start gap-3">
                <div className="space-y-2 flex-1">
                    <div className="h-4 bg-slate-200 rounded w-3/4" />
                    <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
                <div className="h-4 bg-slate-200 rounded w-12" />
            </div>
            <div className="h-24 bg-slate-100 rounded-lg" />
            <div className="flex justify-between items-center pt-2">
                <div className="h-3 bg-slate-200 rounded w-20" />
                <div className="h-6 bg-slate-200 rounded w-24" />
            </div>
        </div>
    );
}

/**
 * Responsive Template Gallery Component.
 * Renders approved WhatsApp template cards in a 1/2/3 column layout.
 */
export default function TemplateGallery({
    templates = [],
    isLoading = false,
    error = null,
    onSelectTemplate,
    onRetry,
    templateSource = null
}) {
    const [searchQuery, setSearchQuery] = useState('');

    // Filter and normalize templates
    const normalizedTemplates = useMemo(() => {
        return (templates || [])
            .map(normalizeTemplate)
            .filter(Boolean)
            .filter(t => t.status === 'APPROVED' || !t.status);
    }, [templates]);

    const filteredTemplates = useMemo(() => {
        if (!searchQuery.trim()) return normalizedTemplates;
        const q = searchQuery.toLowerCase();
        return normalizedTemplates.filter(t =>
            t.title.toLowerCase().includes(q) ||
            t.name.toLowerCase().includes(q) ||
            t.description.toLowerCase().includes(q) ||
            t.text.toLowerCase().includes(q)
        );
    }, [normalizedTemplates, searchQuery]);

    return (
        <div className="space-y-6">
            {/* Search Header */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2.5 mb-0.5">
                        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                            WhatsApp Templates
                        </h2>
                        {!isLoading && templateSource === 'omniflow' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <Wifi size={10} />
                                Live from Omniflow
                            </span>
                        )}
                        {!isLoading && templateSource === 'fallback' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                                <WifiOff size={10} />
                                Fallback templates
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-slate-500">
                        {templateSource === 'omniflow'
                            ? 'Showing approved templates from your Omniflow / Meta WhatsApp Business account.'
                            : 'Select an approved template to send a verified WhatsApp message to your contacts.'}
                    </p>
                </div>

                {/* Lightweight Search Input */}
                <div className="relative w-full sm:w-72">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search templates..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-8 py-2 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent transition-all placeholder:text-slate-400"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* Gallery Grid States */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    <TemplateCardSkeleton />
                    <TemplateCardSkeleton />
                    <TemplateCardSkeleton />
                </div>
            ) : error ? (
                <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl flex flex-col items-center justify-center text-center space-y-3">
                    <AlertCircle size={28} className="text-amber-500" />
                    <div>
                        <h4 className="text-sm font-bold text-slate-800">Failed to Load Templates</h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                            {typeof error === 'string' ? error : error?.message || 'Unable to retrieve templates.'}
                        </p>
                    </div>
                    {onRetry && (
                        <button
                            onClick={onRetry}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-lg transition-colors shadow-sm"
                        >
                            <RefreshCw size={14} />
                            Retry
                        </button>
                    )}
                </div>
            ) : normalizedTemplates.length === 0 ? (
                <div className="p-12 bg-white border border-slate-200 rounded-xl text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                        <FileText size={24} />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-slate-800">No Approved Templates</h4>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-0.5">
                            There are currently no active or approved WhatsApp templates configured in your account.
                        </p>
                    </div>
                </div>
            ) : filteredTemplates.length === 0 ? (
                <div className="p-10 bg-white border border-slate-200 rounded-xl text-center space-y-3">
                    <p className="text-xs font-semibold text-slate-700">
                        No templates found matching "{searchQuery}"
                    </p>
                    <button
                        onClick={() => setSearchQuery('')}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                        Clear search filter
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredTemplates.map((template) => (
                        <TemplateCard
                            key={template.id}
                            template={template}
                            onSelect={onSelectTemplate}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
