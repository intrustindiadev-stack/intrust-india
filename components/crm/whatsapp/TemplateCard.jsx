'use client';

import React from 'react';
import { MessageSquare, ArrowRight, Layers, CheckCircle2 } from 'lucide-react';
import TemplateMessagePreview from './TemplateMessagePreview';

/**
 * Single WhatsApp Template Card Component.
 * Visual representation of an approved template with message preview and selection action.
 */
export default function TemplateCard({ template, onSelect }) {
    if (!template) return null;

    const varCount = Array.isArray(template.variables) ? template.variables.length : 0;

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect(template);
        }
    };

    return (
        <div
            tabIndex={0}
            role="button"
            onKeyDown={handleKeyDown}
            onClick={() => onSelect(template)}
            className="group relative bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 transition-all flex flex-col justify-between cursor-pointer"
        >
            {/* Header: Title & Badges */}
            <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="text-base font-bold text-slate-900 truncate tracking-tight">
                                {template.title || template.name}
                            </h3>
                            {template.language && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-slate-100 text-slate-600 border border-slate-200">
                                    {template.language}
                                </span>
                            )}
                        </div>
                        {template.description && (
                            <p className="text-xs text-slate-500 line-clamp-1">{template.description}</p>
                        )}
                    </div>
                    {template.category && (
                        <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-slate-50 text-slate-500 border border-slate-200">
                            {template.category}
                        </span>
                    )}
                </div>

                {/* WhatsApp Chat Bubble Preview Box */}
                <div className="my-3 p-3.5 bg-slate-50 rounded-lg border border-slate-200/80 relative overflow-hidden">
                    {/* Small WhatsApp chat bubble effect */}
                    <div className="absolute top-0 right-0 w-2 h-2 bg-emerald-500 rounded-bl-sm" />
                    
                    <div className="max-h-28 overflow-hidden line-clamp-4">
                        <TemplateMessagePreview
                            text={template.text || template.body}
                            variables={template.variables}
                            highlightPlaceholders={true}
                        />
                    </div>
                </div>
            </div>

            {/* Card Footer: Metadata & Action */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                    <Layers size={14} className="text-slate-400" />
                    <span>{varCount} {varCount === 1 ? 'variable' : 'variables'}</span>
                </div>

                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onSelect(template);
                    }}
                    aria-label={`Use ${template.title || template.name} template`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 group-hover:text-slate-900 group-hover:bg-slate-100 transition-colors"
                >
                    <span>Use template</span>
                    <ArrowRight size={14} className="text-slate-400 group-hover:text-slate-700 transition-transform group-hover:translate-x-0.5" />
                </button>
            </div>
        </div>
    );
}
