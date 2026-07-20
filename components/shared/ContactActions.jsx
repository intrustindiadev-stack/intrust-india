'use client';

import { Phone, Mail, MessageCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function ContactActions({ phone, email, name = 'Valued Partner', compact = false, customMessage = '', className = '' }) {
    const getCleanPhone = (rawPhone) => {
        if (!rawPhone) return '';
        let digits = rawPhone.replace(/\D/g, '');
        if (digits.length === 10) return `91${digits}`;
        if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`;
        return digits;
    };

    const cleanPhone = getCleanPhone(phone);
    const defaultMsg = customMessage || `Hello ${name}, greetings from InTrust! We would like to connect regarding your account.`;

    const handleWhatsApp = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!cleanPhone) {
            toast.error('No phone number available for WhatsApp');
            return;
        }
        const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(defaultMsg)}`;
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const handleCall = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!phone) {
            toast.error('No phone number available');
            return;
        }
        window.location.href = `tel:${phone}`;
    };

    const handleEmail = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!email) {
            toast.error('No email address available');
            return;
        }
        const subject = `InTrust Inquiry - ${name}`;
        window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(defaultMsg)}`;
    };

    if (compact) {
        return (
            <div className={`flex items-center gap-1.5 ${className}`}>
                <button
                    onClick={handleWhatsApp}
                    disabled={!phone}
                    className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    title={phone ? `WhatsApp ${phone}` : 'No phone number'}
                >
                    <MessageCircle size={14} />
                </button>

                <button
                    onClick={handleCall}
                    disabled={!phone}
                    className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    title={phone ? `Call ${phone}` : 'No phone number'}
                >
                    <Phone size={14} />
                </button>

                <button
                    onClick={handleEmail}
                    disabled={!email}
                    className="p-1.5 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-600 hover:text-white dark:bg-purple-950/40 dark:text-purple-400 border border-purple-200/60 dark:border-purple-800 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    title={email ? `Email ${email}` : 'No email address'}
                >
                    <Mail size={14} />
                </button>
            </div>
        );
    }

    return (
        <div className={`flex flex-wrap items-center gap-2 ${className}`}>
            <button
                onClick={handleWhatsApp}
                disabled={!phone}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
                <MessageCircle size={14} />
                WhatsApp
            </button>

            <button
                onClick={handleCall}
                disabled={!phone}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
                <Phone size={14} />
                Call
            </button>

            <button
                onClick={handleEmail}
                disabled={!email}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-purple-50 text-purple-700 hover:bg-purple-600 hover:text-white dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800 transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
                <Mail size={14} />
                Email
            </button>
        </div>
    );
}
