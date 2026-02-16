'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, CheckCircle, Loader2 } from 'lucide-react';

export default function ContactForm() {
    const [formState, setFormState] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    });

    const [focused, setFocused] = useState('');
    const [status, setStatus] = useState('idle'); // idle, loading, success, error

    const handleChange = (e) => {
        setFormState(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus('loading');

        // Simulate API call
        setTimeout(() => {
            setStatus('success');
            setFormState({ name: '', email: '', subject: '', message: '' });
            setTimeout(() => setStatus('idle'), 3000);
        }, 1500);
    };

    const inputClasses = "w-full px-4 py-4 rounded-xl bg-gray-50/50 border border-gray-200 outline-hidden transition-all duration-300 focus:bg-white focus:ring-2 focus:ring-blue-100 placeholder-transparent peer";
    const labelClasses = "absolute left-4 top-4 text-gray-500 text-sm transition-all duration-200 peer-placeholder-shown:text-base peer-placeholder-shown:top-4 peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-blue-500 peer-focus:bg-white peer-focus:px-2 pointer-events-none rounded-md";

    return (
        <div className="bg-white/80 backdrop-blur-xl p-8 md:p-10 rounded-3xl shadow-2xl border border-white/50 relative overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-blue-100/50 to-transparent rounded-bl-full pointer-events-none -z-10" />

            <div className="mb-8">
                <h3 className="text-3xl font-bold font-outfit text-gray-900 mb-2">Send us a Message</h3>
                <p className="text-gray-500">We usually respond within 24 hours.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="relative group">
                        <input
                            type="text"
                            name="name"
                            id="name"
                            value={formState.name}
                            onChange={handleChange}
                            required
                            placeholder="Name"
                            className={inputClasses}
                        />
                        <label htmlFor="name" className={labelClasses}>Full Name</label>
                    </div>

                    <div className="relative group">
                        <input
                            type="email"
                            name="email"
                            id="email"
                            value={formState.email}
                            onChange={handleChange}
                            required
                            placeholder="Email"
                            className={inputClasses}
                        />
                        <label htmlFor="email" className={labelClasses}>Email Address</label>
                    </div>
                </div>

                <div className="relative group">
                    <input
                        type="text"
                        name="subject"
                        id="subject"
                        value={formState.subject}
                        onChange={handleChange}
                        required
                        placeholder="Subject"
                        className={inputClasses}
                    />
                    <label htmlFor="subject" className={labelClasses}>Subject</label>
                </div>

                <div className="relative group">
                    <textarea
                        name="message"
                        id="message"
                        value={formState.message}
                        onChange={handleChange}
                        required
                        rows={4}
                        placeholder="Message"
                        className={`${inputClasses} resize-none`}
                    />
                    <label htmlFor="message" className={labelClasses}>How can we help?</label>
                </div>

                <button
                    type="submit"
                    disabled={status === 'loading' || status === 'success'}
                    className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-300 transform active:scale-95
                    ${status === 'success' ? 'bg-green-500 text-white shadow-green-200' : 'bg-[#171A21] text-white hover:bg-gray-800 shadow-xl shadow-gray-200 hover:shadow-2xl'}
                `}
                >
                    <AnimatePresence mode='wait'>
                        {status === 'loading' ? (
                            <motion.div
                                key="loading"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                <Loader2 className="animate-spin" />
                            </motion.div>
                        ) : status === 'success' ? (
                            <motion.div
                                key="success"
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="flex items-center gap-2"
                            >
                                <CheckCircle size={20} />
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
                                <Send size={18} />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </button>
            </form>
        </div>
    );
}