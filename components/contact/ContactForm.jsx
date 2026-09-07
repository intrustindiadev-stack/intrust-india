'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, CheckCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ContactForm() {
    const [formState, setFormState] = useState({
        name: '',
        email: '',
        subject: '',
        message: '',
        company: '', // honeypot
    });

    const [status, setStatus] = useState('idle'); // idle, loading, success, error

    const handleChange = (e) => {
        setFormState(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!EMAIL_RE.test(formState.email.trim())) {
            toast.error('Please enter a valid email address.');
            return;
        }

        setStatus('loading');

        try {
            const res = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formState),
            });

            if (res.ok) {
                setStatus('success');
                setFormState({ name: '', email: '', subject: '', message: '', company: '' });
                setTimeout(() => setStatus('idle'), 3500);
            } else {
                const data = await res.json().catch(() => ({}));
                setStatus('error');
                toast.error(data.error || 'Something went wrong. Please try again.');
                setTimeout(() => setStatus('idle'), 100);
            }
        } catch {
            setStatus('error');
            toast.error('Network error. Please check your connection and try again.');
            setTimeout(() => setStatus('idle'), 100);
        }
    };

    return (
        <div className="w-full">
            <form onSubmit={handleSubmit} className="space-y-5">
                {/* Honeypot for spam bots */}
                <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', height: 0, overflow: 'hidden' }}>
                    <label htmlFor="company">Company</label>
                    <input
                        type="text"
                        name="company"
                        id="company"
                        tabIndex={-1}
                        autoComplete="off"
                        value={formState.company}
                        onChange={handleChange}
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* Full Name */}
                    <div className="space-y-1.5">
                        <label htmlFor="name" className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                            Full Name <span className="text-blue-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="name"
                            id="name"
                            value={formState.name}
                            onChange={handleChange}
                            required
                            placeholder="e.g. Rahul Sharma"
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-2xs"
                        />
                    </div>

                    {/* Email Address */}
                    <div className="space-y-1.5">
                        <label htmlFor="email" className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                            Email Address <span className="text-blue-500">*</span>
                        </label>
                        <input
                            type="email"
                            name="email"
                            id="email"
                            value={formState.email}
                            onChange={handleChange}
                            required
                            placeholder="e.g. rahul@example.com"
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-2xs"
                        />
                    </div>
                </div>

                {/* Subject */}
                <div className="space-y-1.5">
                    <label htmlFor="subject" className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Subject <span className="text-blue-500">*</span>
                    </label>
                    <input
                        type="text"
                        name="subject"
                        id="subject"
                        value={formState.subject}
                        onChange={handleChange}
                        required
                        placeholder="e.g. Order Tracking Inquiry / General Support"
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-2xs"
                    />
                </div>

                {/* Message */}
                <div className="space-y-1.5">
                    <label htmlFor="message" className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Message <span className="text-blue-500">*</span>
                    </label>
                    <textarea
                        name="message"
                        id="message"
                        value={formState.message}
                        onChange={handleChange}
                        required
                        rows={5}
                        placeholder="Describe your inquiry or question in detail..."
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-2xs resize-none"
                    />
                </div>

                {/* Submit Button - Vibrant InTrust Blue Theme */}
                <button
                    type="submit"
                    disabled={status === 'loading' || status === 'success'}
                    className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200 shadow-md transform active:scale-[0.99] cursor-pointer disabled:cursor-not-allowed ${
                        status === 'success'
                            ? 'bg-emerald-600 text-white shadow-emerald-500/25'
                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/30 hover:shadow-blue-600/40'
                    }`}
                >
                    <AnimatePresence mode="wait">
                        {status === 'loading' ? (
                            <motion.div
                                key="loading"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex items-center gap-2"
                            >
                                <Loader2 className="animate-spin" size={18} />
                                <span>Sending Message...</span>
                            </motion.div>
                        ) : status === 'success' ? (
                            <motion.div
                                key="success"
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="flex items-center gap-2"
                            >
                                <CheckCircle size={18} />
                                <span>Message Sent Successfully</span>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="default"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex items-center gap-2"
                            >
                                <span>Send Message</span>
                                <Send size={16} />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </button>
            </form>
        </div>
    );
}