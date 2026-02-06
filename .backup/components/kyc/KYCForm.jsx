'use client';

import { useState } from 'react';
import { Upload, CheckCircle, AlertCircle, Clock, FileText, Camera, ChevronRight, Shield, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function KYCForm({ userType = 'customer', onSubmit, initialData = {} }) {
    const [kycStatus, setKycStatus] = useState('not_started'); // not_started, pending, verified, rejected
    const [currentStep, setCurrentStep] = useState(0);

    const [formData, setFormData] = useState({
        fullName: initialData.fullName || '',
        dateOfBirth: initialData.dateOfBirth || '',
        address: initialData.address || '',
        city: initialData.city || '',
        state: initialData.state || '',
        pincode: initialData.pincode || '',
        panNumber: initialData.panNumber || '',
        aadharNumber: initialData.aadharNumber || '',
        panDocument: null,
        aadharDocument: null,
        addressProof: null,
        selfie: null
    });

    const [uploadedFiles, setUploadedFiles] = useState({
        panDocument: null,
        aadharDocument: null,
        addressProof: null,
        selfie: null
    });

    const handleFileUpload = (field, file) => {
        setUploadedFiles(prev => ({ ...prev, [field]: file }));
        setFormData(prev => ({ ...prev, [field]: file }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setKycStatus('pending');
        if (onSubmit) {
            onSubmit(formData);
        }
    };

    const sections = [
        { id: 'personal', title: 'Personal Info', icon: FileText, fields: ['fullName', 'dateOfBirth'] },
        { id: 'address', title: 'Address', icon: FileText, fields: ['address', 'city', 'state', 'pincode'] },
        { id: 'identity', title: 'Identity', icon: Shield, fields: ['panNumber', 'aadharNumber'] },
        { id: 'docs', title: 'Documents', icon: Upload, fields: ['panDocument', 'aadharDocument', 'addressProof', 'selfie'] },
    ];

    const nextSection = () => {
        if (currentStep < sections.length - 1) setCurrentStep(currentStep + 1);
    };

    const prevSection = () => {
        if (currentStep > 0) setCurrentStep(currentStep - 1);
    };

    // App-Style Mobile Header
    const ProgressHeader = () => (
        <div className="flex items-center justify-between mb-6 px-1">
            {sections.map((section, idx) => (
                <div key={section.id} className="flex flex-col items-center gap-1 relative z-10 w-full">
                    <div
                        className={`w-full h-1 rounded-full bg-gray-100 overflow-hidden ${idx !== 0 ? '-ml-1' : ''}`}
                    >
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: idx <= currentStep ? '100%' : '0%' }}
                            transition={{ duration: 0.3 }}
                            className={`h-full ${idx < currentStep ? 'bg-green-500' : idx === currentStep ? 'bg-blue-600' : 'bg-transparent'}`}
                        />
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <div className="w-full max-w-2xl mx-auto rounded-3xl bg-white shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
            <div className="bg-slate-50/50 p-6 border-b border-slate-100">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">KYC Verification</h2>
                        <p className="text-sm text-slate-500">Secure Identity Verification</p>
                    </div>
                    <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold border border-blue-100 flex items-center gap-1">
                        <Shield size={12} />
                        Bank Grade Security
                    </div>
                </div>
                <ProgressHeader />
            </div>

            <form onSubmit={handleSubmit} className="p-6">
                <AnimatePresence mode="wait">
                    {currentStep === 0 && (
                        <motion.div key="personal" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} transition={{ duration: 0.2 }}>
                            <h3 className="text-lg font-bold text-slate-800 mb-6">Let's start with basics</h3>
                            <div className="space-y-5">
                                <FloatingInput label="Full Name (As per PAN)" value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} autoFocus />
                                <FloatingInput label="Date of Birth" type="date" value={formData.dateOfBirth} onChange={e => setFormData({ ...formData, dateOfBirth: e.target.value })} />
                            </div>
                        </motion.div>
                    )}

                    {currentStep === 1 && (
                        <motion.div key="address" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} transition={{ duration: 0.2 }}>
                            <h3 className="text-lg font-bold text-slate-800 mb-6">Where do you live?</h3>
                            <div className="space-y-5">
                                <FloatingInput label="Street Address" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
                                <div className="grid grid-cols-2 gap-5">
                                    <FloatingInput label="City" value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} />
                                    <FloatingInput label="State" value={formData.state} onChange={e => setFormData({ ...formData, state: e.target.value })} />
                                </div>
                                <FloatingInput label="Pincode" value={formData.pincode} onChange={e => setFormData({ ...formData, pincode: e.target.value })} type="number" maxLength={6} />
                            </div>
                        </motion.div>
                    )}

                    {currentStep === 2 && (
                        <motion.div key="identity" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} transition={{ duration: 0.2 }}>
                            <h3 className="text-lg font-bold text-slate-800 mb-6">Identity Proofs</h3>
                            <div className="space-y-5">
                                <FloatingInput label="PAN Number" value={formData.panNumber} onChange={e => setFormData({ ...formData, panNumber: e.target.value.toUpperCase() })} maxLength={10} className="uppercase" />
                                <FloatingInput label="Aadhar Number" value={formData.aadharNumber} onChange={e => setFormData({ ...formData, aadharNumber: e.target.value })} type="number" maxLength={12} />
                            </div>
                        </motion.div>
                    )}

                    {currentStep === 3 && (
                        <motion.div key="docs" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} transition={{ duration: 0.2 }}>
                            <h3 className="text-lg font-bold text-slate-800 mb-6">Upload Documents</h3>
                            <div className="grid grid-cols-1 gap-4">
                                <FileUploadItem label="PAN Card" field="panDocument" file={uploadedFiles.panDocument} onUpload={handleFileUpload} />
                                <FileUploadItem label="Aadhar Card" field="aadharDocument" file={uploadedFiles.aadharDocument} onUpload={handleFileUpload} />
                                <FileUploadItem label="Selfie" field="selfie" file={uploadedFiles.selfie} onUpload={handleFileUpload} icon={Camera} accept="image/*" />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="mt-8 pt-6 border-t border-slate-100 flex gap-4">
                    {currentStep > 0 && (
                        <button
                            type="button"
                            onClick={prevSection}
                            className="px-6 py-3.5 rounded-xl font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                        >
                            Back
                        </button>
                    )}

                    {currentStep < sections.length - 1 ? (
                        <button
                            type="button"
                            onClick={nextSection}
                            className="flex-1 px-6 py-3.5 bg-slate-900 text-white font-bold rounded-xl shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                        >
                            Next Step
                            <ChevronRight size={18} />
                        </button>
                    ) : (
                        <button
                            type="submit"
                            className="flex-1 px-6 py-3.5 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                        >
                            Complete Verification
                            <CheckCircle size={18} />
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
}

function FloatingInput({ label, className = "", ...props }) {
    return (
        <div className="relative group">
            <input
                className={`w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none font-medium placeholder:text-transparent peer ${className}`}
                placeholder={label}
                {...props}
            />
            <label className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm transition-all pointer-events-none peer-focus:-top-2 peer-focus:left-2 peer-focus:text-xs peer-focus:text-blue-600 peer-focus:bg-white peer-focus:px-2 peer-focus:font-bold peer-[:not(:placeholder-shown)]:-top-2 peer-[:not(:placeholder-shown)]:left-2 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-slate-500 peer-[:not(:placeholder-shown)]:bg-white peer-[:not(:placeholder-shown)]:px-2">
                {label}
            </label>
        </div>
    )
}

function FileUploadItem({ label, field, file, onUpload, icon: Icon = FileText, accept }) {
    return (
        <div className="relative flex items-center justify-between p-4 border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-white hover:border-blue-300 transition-all group">
            <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${file ? 'bg-green-100 text-green-600' : 'bg-white border border-slate-200 text-slate-400 group-hover:text-blue-500'}`}>
                    {file ? <CheckCircle size={20} /> : <Icon size={20} />}
                </div>
                <div>
                    <h4 className="font-bold text-slate-800 text-sm">{label}</h4>
                    <p className="text-xs text-slate-500">{file ? file.name : 'Max 5MB • PDF/JPG'}</p>
                </div>
            </div>
            <label className={`cursor-pointer px-4 py-2 rounded-lg text-xs font-bold transition-all ${file ? 'bg-slate-100 text-slate-600' : 'bg-slate-900 text-white shadow-md'}`}>
                {file ? 'Change' : 'Upload'}
                <input type="file" className="hidden" accept={accept} onChange={(e) => onUpload(field, e.target.files[0])} />
            </label>
        </div>
    )
}
