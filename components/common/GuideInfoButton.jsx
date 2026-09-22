'use client';
import { Info } from 'lucide-react';
import GuideInfoModal from './GuideInfoModal';
import { useAuth } from '@/lib/contexts/AuthContext';
import { MARKETING_GUIDES } from '@/lib/marketing-guides';
import { CUSTOMER_GUIDES } from '@/lib/customer-guides';

export default function GuideInfoButton({ pageKey, scope = 'marketing', className = '' }) {
    const { guideKey, openGuide, closeGuide } = useAuth();
    const guides = scope === 'customer' ? CUSTOMER_GUIDES : MARKETING_GUIDES;
    const guide = guides[pageKey];
    if (!guide) return null;
    const open = guideKey === `${scope}:${pageKey}`;
    return (
        <>
            <button
                type="button" onClick={() => openGuide(`${scope}:${pageKey}`)} aria-label="How this page works"
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 border border-transparent hover:border-blue-100 dark:hover:border-blue-900 transition-all cursor-pointer ${className}`}
            >
                <Info size={15} />
                <span className="hidden sm:inline">How it works</span>
            </button>
            <GuideInfoModal guide={guide} open={open} onClose={closeGuide} />
        </>
    );
}
