'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function UnauthorizedRedirect({ to = '/login', message = 'Unauthorized Access. Redirecting...' }) {
    const router = useRouter();

    useEffect(() => {
        const timeout = setTimeout(() => {
            router.push(to);
        }, 1500);
        return () => clearTimeout(timeout);
    }, [router, to]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#F8FAFC]/80 dark:bg-slate-950/80 backdrop-blur-md font-[family-name:var(--font-outfit)]">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col items-center justify-center space-y-4 bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-100 dark:border-white/5"
            >
                <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{message}</h2>
                <div className="flex gap-1.5 mt-2">
                    <div className="w-2 h-2 rounded-full bg-red-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 rounded-full bg-red-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 rounded-full bg-red-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
            </motion.div>
        </div>
    );
}
