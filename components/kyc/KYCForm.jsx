'use client';

import { useState } from 'react';
import { CheckCircle, Shield, ChevronRight, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function KYCForm({ onSubmit, initialData = {} }) {
    const [formData, setFormData] = useState({
        fullName: initialData.fullName || '',
        phone: initialData.phone || '',
        dateOfBirth: initialData.dateOfBirth || '',
        panNumber: initialData.panNumber || '',
        address: initialData.address || ''
    });

    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const validate = () => {
        const newErrors = {};

        if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';

        // Basic phone validation (10 digits)
        const phoneRegex = /^[0-9]{10}$/;
        if (!formData.phone.trim()) {
            newErrors.phone = 'Phone number is required';
        } else if (!phoneRegex.test(formData.phone.replace(/[^0-9]/g, ''))) {
            newErrors.phone = 'Please enter a valid 10-digit phone number';
        }

        if (!formData.dateOfBirth) {
            newErrors.dateOfBirth = 'Date of birth is required';
        } else {
            const dob = new Date(formData.dateOfBirth);
            const today = new Date();
            if (dob > today) {
                newErrors.dateOfBirth = 'Date of birth cannot be in the future';
            }
        }

        const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
        if (!formData.panNumber.trim()) {
            newErrors.panNumber = 'PAN Number is required';
        } else if (!panRegex.test(formData.panNumber)) {
            newErrors.panNumber = 'Invalid PAN format (e.g., ABCDE1234F)';
        }

        if (!formData.address.trim()) newErrors.address = 'Address is required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validate()) return;

        setIsSubmitting(true);

        // Simulate API call delay if needed or just pass up
        try {
            if (onSubmit) {
                await onSubmit(formData);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto rounded-3xl bg-white shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
            <div className="bg-slate-50/50 p-6 border-b border-slate-100">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">KYC Verification</h2>
                        <p className="text-sm text-slate-500">Complete your profile to unlock full access</p>
                    </div>
                    <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold border border-blue-100 flex items-center gap-1">
                        <Shield size={12} />
                        Bank Grade Security
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FloatingInput
                        label="Full Name"
                        value={formData.fullName}
                        onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                        error={errors.fullName}
                    />

                    <FloatingInput
                        label="Phone Number"
                        value={formData.phone}
                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                        error={errors.phone}
                        type="tel"
                        maxLength={10}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FloatingInput
                        label="Date of Birth"
                        value={formData.dateOfBirth}
                        onChange={e => setFormData({ ...formData, dateOfBirth: e.target.value })}
                        error={errors.dateOfBirth}
                        type="date"
                    />

                    <FloatingInput
                        label="PAN Number"
                        value={formData.panNumber}
                        onChange={e => setFormData({ ...formData, panNumber: e.target.value.toUpperCase() })}
                        error={errors.panNumber}
                        maxLength={10}
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 ml-1">Full Address</label>
                    <textarea
                        className={`w-full px-4 py-3 bg-slate-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none font-medium text-slate-900 resize-none ${errors.address ? 'border-red-500' : 'border-slate-200'}`}
                        rows="3"
                        placeholder="Enter your full address"
                        value={formData.address}
                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                    ></textarea>
                    {errors.address && (
                        <p className="text-red-500 text-xs mt-1 ml-1 flex items-center gap-1">
                            <AlertCircle size={10} /> {errors.address}
                        </p>
                    )}
                </div>

                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? 'Submitting...' : 'Submit Verification'}
                        {!isSubmitting && <ChevronRight size={18} />}
                    </button>
                </div>
            </form>
        </div>
    );
}

function FloatingInput({ label, error, className = "", ...props }) {
    return (
        <div className="w-full">
            <div className="relative group">
                <input
                    className={`w-full px-4 py-3.5 bg-slate-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none font-medium placeholder:text-transparent peer ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-200'} ${className}`}
                    placeholder={label}
                    {...props}
                />
                <label className={`absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm transition-all pointer-events-none 
                    peer-focus:-top-2 peer-focus:left-2 peer-focus:text-xs peer-focus:text-blue-600 peer-focus:bg-white peer-focus:px-2 peer-focus:font-bold 
                    peer-[:not(:placeholder-shown)]:-top-2 peer-[:not(:placeholder-shown)]:left-2 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-slate-500 peer-[:not(:placeholder-shown)]:bg-white peer-[:not(:placeholder-shown)]:px-2
                    ${error ? 'peer-focus:text-red-500 peer-[:not(:placeholder-shown)]:text-red-500' : ''}`}>
                    {label}
                </label>
            </div>
            {error && (
                <p className="text-red-500 text-xs mt-1 ml-1 flex items-center gap-1">
                    <AlertCircle size={10} /> {error}
                </p>
            )}
        </div>
    )
}
