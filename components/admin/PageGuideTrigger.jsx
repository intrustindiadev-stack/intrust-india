'use client';
import { BookOpen } from 'lucide-react';

export default function PageGuideTrigger({ guide, onOpen }) {
  if (!guide) return null;
  return (
    <button
      onClick={onOpen}
      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium
                 text-slate-500 hover:text-slate-700 hover:bg-slate-100
                 border border-transparent hover:border-[#EAEFF4] transition-all duration-150"
    >
      <BookOpen className="h-3.5 w-3.5" />
      Page Guide
    </button>
  );
}
