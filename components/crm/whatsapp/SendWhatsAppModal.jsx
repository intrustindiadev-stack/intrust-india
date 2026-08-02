'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { X, Send, AlertCircle, CheckCircle2, Loader2, MessageSquare, Phone, User, Info, ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useSendWhatsAppTemplate } from '@/hooks/useSendWhatsAppTemplate';
import { createClient } from '@/lib/supabaseClient';
import TemplateMessagePreview from './TemplateMessagePreview';
import WhatsAppSenderErrorBoundary from './WhatsAppSenderErrorBoundary';

const E164_REGEX = /^\+[1-9]\d{6,14}$/;

function SendWhatsAppModalContent({
    isOpen = false,
    selectedTemplate = null,
    onClose,
    contactId,
    contactName,
    contactPhoneE164,
    onSuccess
}) {
    // Recipient mode state: 'contact' | 'custom'
    const [recipientMode, setRecipientMode] = useState('contact');

    // Contact selection state (when no initial contact provided)
    const [selectedContactId, setSelectedContactId] = useState(contactId || '');
    const [selectedContactName, setSelectedContactName] = useState(contactName || '');
    const [selectedContactPhone, setSelectedContactPhone] = useState(contactPhoneE164 || '');
    
    // Contact dropdown search state
    const [crmContacts, setCrmContacts] = useState([]);
    const [loadingContacts, setLoadingContacts] = useState(false);

    // Custom phone number state
    const [customPhone, setCustomPhone] = useState('');
    const [customPhoneError, setCustomPhoneError] = useState('');

    // Dynamic variable values state: { [key]: string }
    const [variableValues, setVariableValues] = useState({});
    const [variableErrors, setVariableErrors] = useState({});

    // API send hook
    const { sendTemplate, isLoading: isSubmitting, error: apiError, resetState: resetApiState } = useSendWhatsAppTemplate();

    // Sync initial contact props
    useEffect(() => {
        if (contactId || contactPhoneE164) {
            setRecipientMode('contact');
            setSelectedContactId(contactId || '');
            setSelectedContactName(contactName || '');
            setSelectedContactPhone(contactPhoneE164 || '');
        } else {
            setRecipientMode('contact');
            setSelectedContactId('');
            setSelectedContactName('');
            setSelectedContactPhone('');
        }
    }, [contactId, contactName, contactPhoneE164]);

    // Fetch CRM contacts list if no contact context is supplied
    useEffect(() => {
        if (!isOpen || contactId) return;

        let isMounted = true;
        async function fetchContacts() {
            setLoadingContacts(true);
            try {
                const supabase = createClient();
                const { data, error } = await supabase
                    .from('crm_leads')
                    .select('id, contact_name, phone, title')
                    .not('phone', 'is', null)
                    .order('contact_name', { ascending: true })
                    .limit(50);

                if (!error && data && isMounted) {
                    setCrmContacts(data);
                }
            } catch (err) {
                console.error('Failed to fetch CRM contacts for modal:', err);
            } finally {
                if (isMounted) setLoadingContacts(false);
            }
        }
        fetchContacts();
        return () => { isMounted = false; };
    }, [isOpen, contactId]);

    // Reset and prefill variables when selectedTemplate changes
    useEffect(() => {
        if (!selectedTemplate || !isOpen) return;

        resetApiState();
        setCustomPhoneError('');
        setVariableErrors({});

        const initialVals = {};
        if (Array.isArray(selectedTemplate.variables)) {
            selectedTemplate.variables.forEach((varObj) => {
                let prefilled = '';
                const activeName = selectedContactName || contactName || '';

                if (varObj.defaultFromContact === 'full_name' || varObj.defaultFromContact === 'contact_name' || varObj.key === 'name') {
                    prefilled = activeName;
                } else if (varObj.defaultFromContact === 'company' || varObj.key === 'company') {
                    prefilled = '';
                }

                initialVals[varObj.key] = prefilled;
            });
        }
        setVariableValues(initialVals);
    }, [selectedTemplate, isOpen, selectedContactName, contactName, resetApiState]);

    // Handle recipient selection change
    const handleSelectCrmContact = (e) => {
        const cId = e.target.value;
        setSelectedContactId(cId);
        const found = crmContacts.find(c => c.id === cId);
        if (found) {
            setSelectedContactName(found.contact_name || '');
            const rawPhone = found.phone || '';
            const e164 = rawPhone.startsWith('+') ? rawPhone : `+${rawPhone.replace(/\D/g, '')}`;
            setSelectedContactPhone(e164);
        } else {
            setSelectedContactName('');
            setSelectedContactPhone('');
        }
    };

    // Mode switch handler
    const handleModeSwitch = (mode) => {
        setRecipientMode(mode);
        setCustomPhoneError('');
        resetApiState();
    };

    // Validate form inputs
    const validateForm = () => {
        let isValid = true;
        setCustomPhoneError('');
        const vErrors = {};

        // Recipient validation
        if (recipientMode === 'custom') {
            const formatted = customPhone.trim().startsWith('+') ? customPhone.trim() : `+${customPhone.trim().replace(/\D/g, '')}`;
            if (!E164_REGEX.test(formatted)) {
                setCustomPhoneError('Enter a valid E.164 phone number (e.g. +919876543210)');
                isValid = false;
            }
        } else {
            if (!selectedContactPhone && !selectedContactId) {
                isValid = false;
            }
        }

        // Variables validation
        if (selectedTemplate && Array.isArray(selectedTemplate.variables)) {
            selectedTemplate.variables.forEach((varObj) => {
                if (varObj.required && (!variableValues[varObj.key] || !variableValues[varObj.key].trim())) {
                    vErrors[varObj.key] = `${varObj.label || varObj.key} is required`;
                    isValid = false;
                }
            });
        }

        setVariableErrors(vErrors);
        return isValid;
    };

    // Handle Form Submit
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm() || !selectedTemplate || isSubmitting) return;

        let payload = {
            templateId: selectedTemplate.id,
            templateName: selectedTemplate.name,
            templateLanguage: selectedTemplate.language || 'en',
            variables: variableValues
        };

        if (recipientMode === 'custom') {
            const formatted = customPhone.trim().startsWith('+') ? customPhone.trim() : `+${customPhone.trim().replace(/\D/g, '')}`;
            payload.recipientType = 'custom_number';
            payload.phoneE164 = formatted;
        } else {
            payload.recipientType = 'contact';
            if (selectedContactId) payload.contactId = selectedContactId;
            if (selectedContactPhone) payload.phoneE164 = selectedContactPhone;
        }

        const res = await sendTemplate(payload);
        if (res.success) {
            toast.success(res.data?.message || 'WhatsApp template message dispatched successfully!');
            if (onSuccess) onSuccess(res.data);
            onClose();
        } else {
            const errMsg = res.error?.message || 'Failed to send WhatsApp message.';
            toast.error(errMsg);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
                className="relative bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-slate-800 font-[family-name:var(--font-outfit)] animate-in fade-in zoom-in-95 duration-150"
            >
                {/* Modal Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
                            <MessageSquare size={20} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 id="modal-title" className="text-lg font-bold text-slate-900 tracking-tight">
                                    Send WhatsApp
                                </h3>
                                {selectedTemplate && (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-slate-100 text-slate-600 border border-slate-200">
                                        {selectedTemplate.title || selectedTemplate.name}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-slate-500">
                                Configure variable parameters and review live preview before dispatch.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                        >
                            <ArrowLeft size={14} />
                            <span>Choose another template</span>
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                            aria-label="Close dialog"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Modal Body: 2 Column Composition */}
                {!selectedTemplate ? (
                    <div className="p-8 text-center space-y-3">
                        <AlertCircle size={32} className="mx-auto text-amber-500" />
                        <p className="text-sm font-semibold text-slate-700">No template selected.</p>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-semibold text-white bg-slate-800 rounded-lg hover:bg-slate-900"
                        >
                            Back to Template Gallery
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
                        
                        {/* Left Column: Recipient & Dynamic Variables Form (7 cols) */}
                        <div className="lg:col-span-7 space-y-6">
                            
                            {/* API Level Error Alert */}
                            {apiError && (
                                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
                                    <AlertCircle size={16} className="text-rose-500 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-bold">Transmission Error</p>
                                        <p className="mt-0.5">{apiError.message}</p>
                                    </div>
                                </div>
                            )}

                            {/* Recipient Control Section */}
                            <div className="space-y-3">
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                                    1. Recipient Selection
                                </label>
                                
                                {/* Segmented Control */}
                                <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold">
                                    <button
                                        type="button"
                                        onClick={() => handleModeSwitch('contact')}
                                        className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                                            recipientMode === 'contact'
                                                ? 'bg-white text-slate-900 shadow-sm'
                                                : 'text-slate-500 hover:text-slate-800'
                                        }`}
                                    >
                                        <User size={14} />
                                        <span>Existing Contact</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleModeSwitch('custom')}
                                        className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                                            recipientMode === 'custom'
                                                ? 'bg-white text-slate-900 shadow-sm'
                                                : 'text-slate-500 hover:text-slate-800'
                                        }`}
                                    >
                                        <Phone size={14} />
                                        <span>Custom Number</span>
                                    </button>
                                </div>

                                {/* Mode Content */}
                                {recipientMode === 'contact' ? (
                                    <div className="space-y-2">
                                        {selectedContactPhone ? (
                                            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                                                <div>
                                                    <p className="font-bold text-slate-900">{selectedContactName || 'Selected Contact'}</p>
                                                    <p className="text-slate-500 font-mono mt-0.5">{selectedContactPhone}</p>
                                                </div>
                                                <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-md text-[10px] font-extrabold uppercase border border-emerald-200">
                                                    Verified
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="space-y-1">
                                                <select
                                                    value={selectedContactId}
                                                    onChange={handleSelectCrmContact}
                                                    disabled={loadingContacts}
                                                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400"
                                                >
                                                    <option value="">-- Select a CRM Lead / Contact --</option>
                                                    {crmContacts.map(c => (
                                                        <option key={c.id} value={c.id}>
                                                            {c.contact_name} ({c.phone || 'No phone'})
                                                        </option>
                                                    ))}
                                                </select>
                                                {loadingContacts && <p className="text-[10px] text-slate-400">Loading contacts...</p>}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        <input
                                            type="text"
                                            placeholder="+919876543210 (E.164 format)"
                                            value={customPhone}
                                            onChange={(e) => {
                                                setCustomPhone(e.target.value);
                                                setCustomPhoneError('');
                                            }}
                                            className={`w-full px-3.5 py-2.5 rounded-xl border ${
                                                customPhoneError ? 'border-rose-300 bg-rose-50/50' : 'border-slate-200 bg-white'
                                            } text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400`}
                                        />
                                        {customPhoneError && (
                                            <p className="text-[11px] font-semibold text-rose-600 mt-1">{customPhoneError}</p>
                                        )}
                                        <p className="text-[10px] text-slate-400">Must include country code (e.g. +91 for India).</p>
                                    </div>
                                )}
                            </div>

                            {/* Dynamic Variables Form */}
                            {Array.isArray(selectedTemplate.variables) && selectedTemplate.variables.length > 0 && (
                                <div className="space-y-4 pt-2 border-t border-slate-100">
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                                        2. Fill Template Variables
                                    </label>
                                    
                                    <div className="space-y-3">
                                        {selectedTemplate.variables.map((varObj, idx) => (
                                            <div key={varObj.key || idx} className="space-y-1">
                                                <div className="flex justify-between items-center text-xs">
                                                    <label className="font-semibold text-slate-800">
                                                        {varObj.label || `Variable {{${idx + 1}}}`}
                                                        {varObj.required && <span className="text-rose-500 ml-0.5">*</span>}
                                                    </label>
                                                    <span className="text-[10px] font-mono text-slate-400">{`{{${idx + 1}}}`}</span>
                                                </div>
                                                <input
                                                    type="text"
                                                    placeholder={varObj.placeholder || `Enter ${varObj.label}`}
                                                    value={variableValues[varObj.key] || ''}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setVariableValues(prev => ({ ...prev, [varObj.key]: val }));
                                                        if (variableErrors[varObj.key]) {
                                                            setVariableErrors(prev => ({ ...prev, [varObj.key]: '' }));
                                                        }
                                                    }}
                                                    className={`w-full px-3.5 py-2 rounded-lg border ${
                                                        variableErrors[varObj.key] ? 'border-rose-300 bg-rose-50/50' : 'border-slate-200 bg-white'
                                                    } text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400`}
                                                />
                                                {variableErrors[varObj.key] && (
                                                    <p className="text-[11px] font-semibold text-rose-600">{variableErrors[varObj.key]}</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                        </div>

                        {/* Right Column: Live Chat Preview (5 cols) */}
                        <div className="lg:col-span-5 bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col justify-between space-y-4">
                            <div>
                                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/80">
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                                        <MessageSquare size={14} className="text-emerald-600" />
                                        Live Message Preview
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">WhatsApp</span>
                                </div>

                                {/* Simulated WhatsApp Chat Screen */}
                                <div className="bg-[#efeae2] p-4 rounded-xl border border-slate-200 shadow-inner min-h-[220px]">
                                    <div className="bg-white rounded-lg p-3 shadow-sm border border-slate-200/60 max-w-[90%] relative ml-auto">
                                        <TemplateMessagePreview
                                            text={selectedTemplate.text || selectedTemplate.body}
                                            variables={selectedTemplate.variables}
                                            variableValues={variableValues}
                                            highlightPlaceholders={true}
                                        />
                                        <div className="text-[9px] text-slate-400 text-right mt-2 font-medium flex items-center justify-end gap-1">
                                            <span>Just now</span>
                                            <CheckCircle2 size={10} className="text-emerald-500" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-3 bg-white rounded-lg border border-slate-200/80 text-[11px] text-slate-500 flex items-start gap-2">
                                <Info size={14} className="text-slate-400 shrink-0 mt-0.5" />
                                <p>Unresolved variables are highlighted in amber. All required fields must be populated before sending.</p>
                            </div>
                        </div>

                        {/* Hidden Submit Handler Trigger */}
                        <button type="submit" id="whatsapp-modal-submit-btn" className="hidden" />
                    </form>
                )}

                {/* Modal Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            const btn = document.getElementById('whatsapp-modal-submit-btn');
                            if (btn) btn.click();
                        }}
                        disabled={isSubmitting || !selectedTemplate}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 size={15} className="animate-spin" />
                                <span>Sending...</span>
                            </>
                        ) : (
                            <>
                                <Send size={15} />
                                <span>Send WhatsApp</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

/**
 * Exported Modal with Error Boundary Safety Wrapper
 */
export default function SendWhatsAppModal(props) {
    return (
        <WhatsAppSenderErrorBoundary onClose={props.onClose}>
            <SendWhatsAppModalContent {...props} />
        </WhatsAppSenderErrorBoundary>
    );
}
