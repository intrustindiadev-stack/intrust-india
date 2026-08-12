'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, Send, AlertCircle, CheckCircle2, Loader2, MessageSquare, Phone, User, Info, ArrowLeft, Users, Filter, CheckSquare } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useSendWhatsAppTemplate } from '@/hooks/useSendWhatsAppTemplate';
import { createClient } from '@/lib/supabaseClient';
import TemplateMessagePreview from './TemplateMessagePreview';
import WhatsAppSenderErrorBoundary from './WhatsAppSenderErrorBoundary';

const E164_REGEX = /^\+[1-9]\d{6,14}$/;

function SendWhatsAppDrawerContent({
    isOpen = false,
    selectedTemplate = null,
    onClose,
    contactId,
    contactName,
    contactPhoneE164,
    contactType = 'lead',
    onSuccess,
    currentUserRole,
    currentUserId
}) {
    // Recipient mode state: 'single' | 'multiple' | 'segment'
    const [recipientMode, setRecipientMode] = useState('single');

    // Contacts data
    const [crmContacts, setCrmContacts] = useState([]);
    const [loadingContacts, setLoadingContacts] = useState(false);

    // Single Contact State
    const [selectedSingleId, setSelectedSingleId] = useState(contactId || '');

    // Multiple Contacts State
    const [selectedMultipleIds, setSelectedMultipleIds] = useState([]);

    // Segment State
    const [selectedSegment, setSelectedSegment] = useState('my_leads');
    
    // Custom Number State
    const [customNumber, setCustomNumber] = useState('');

    // Dynamic variable values state: { [key]: string }
    const [variableValues, setVariableValues] = useState({});
    const [variableErrors, setVariableErrors] = useState({});

    // Results state
    const [sendResults, setSendResults] = useState(null); // { total, success, failed, invalid }
    const [isSendingBulk, setIsSendingBulk] = useState(false);

    // API send hook
    const { sendTemplate, resetState: resetApiState } = useSendWhatsAppTemplate();

    // Usage limit state
    const [usage, setUsage] = useState({ count: 0, limit: 100, loading: false });

    // Fetch CRM contacts list and usage limit
    useEffect(() => {
        if (!isOpen) return;

        let isMounted = true;
        
        async function fetchUsage() {
            setUsage(prev => ({ ...prev, loading: true }));
            try {
                const res = await fetch('/api/crm/whatsapp/usage');
                if (res.ok) {
                    const data = await res.json();
                    if (isMounted) setUsage({ count: data.usage || 0, limit: data.limit || 100, loading: false });
                } else {
                    if (isMounted) setUsage(prev => ({ ...prev, loading: false }));
                }
            } catch (err) {
                console.error('Failed to fetch WhatsApp usage', err);
                if (isMounted) setUsage(prev => ({ ...prev, loading: false }));
            }
        }

        async function fetchContacts() {
            setLoadingContacts(true);
            try {
                const supabase = createClient();
                const isManager = ['relationship_manager', 'admin', 'super_admin'].includes(currentUserRole);
                
                let query = supabase
                    .from('crm_leads')
                    .select('id, contact_name, phone, title, status, assigned_to')
                    .not('phone', 'is', null)
                    .order('contact_name', { ascending: true });
                
                if (!isManager && currentUserId) {
                    query = query.eq('assigned_to', currentUserId);
                }

                const { data, error } = await query;
                if (!error && data && isMounted) {
                    setCrmContacts(data);
                }
            } catch (err) {
                console.error('Failed to fetch CRM contacts for drawer:', err);
            } finally {
                if (isMounted) setLoadingContacts(false);
            }
        }
        
        fetchUsage();
        fetchContacts();
        return () => { isMounted = false; };
    }, [isOpen, currentUserRole, currentUserId]);

    // Reset and prefill variables when selectedTemplate changes
    useEffect(() => {
        if (!selectedTemplate || !isOpen) return;

        resetApiState();
        setVariableErrors({});
        setSendResults(null);

        const initialVals = {};
        if (Array.isArray(selectedTemplate.variables)) {
            selectedTemplate.variables.forEach((varObj) => {
                let prefilled = '';
                // Only prefill for single contact for now, for bulk it will use fallback or dynamic map
                if (recipientMode === 'single') {
                    const found = crmContacts.find(c => c.id === selectedSingleId);
                    const activeName = found?.contact_name || contactName || '';
                    if (varObj.defaultFromContact === 'full_name' || varObj.defaultFromContact === 'contact_name' || varObj.key === 'name') {
                        prefilled = activeName;
                    }
                }
                initialVals[varObj.key] = prefilled;
            });
        }
        setVariableValues(initialVals);
    }, [selectedTemplate, isOpen, resetApiState, recipientMode, selectedSingleId, contactName, crmContacts]);

    // Mode switch handler
    const handleModeSwitch = (mode) => {
        setRecipientMode(mode);
        setSelectedSingleId(contactId || '');
        setSelectedMultipleIds([]);
        setSelectedSegment('my_leads');
        setCustomNumber('');
        resetApiState();
        setSendResults(null);
    };

    // Calculate effective recipients based on mode
    const effectiveRecipients = useMemo(() => {
        if (recipientMode === 'single') {
            const found = crmContacts.find(c => c.id === selectedSingleId);
            if (found) return [{ ...found, type: 'lead' }];
            if (selectedSingleId === contactId && contactName && contactPhoneE164) {
                return [{ id: contactId, contact_name: contactName, phone: contactPhoneE164, type: contactType }];
            }
            return [];
        } else if (recipientMode === 'multiple') {
            return crmContacts.filter(c => selectedMultipleIds.includes(c.id)).map(c => ({...c, type: 'lead'}));
        } else if (recipientMode === 'segment') {
            let segContacts = [];
            if (selectedSegment === 'all') segContacts = crmContacts;
            else if (selectedSegment === 'my_leads') segContacts = crmContacts.filter(c => c.assigned_to === currentUserId);
            else if (selectedSegment === 'active') segContacts = crmContacts.filter(c => c.status !== 'converted' && c.status !== 'lost');
            else if (selectedSegment === 'converted') segContacts = crmContacts.filter(c => c.status === 'converted');
            return segContacts.map(c => ({...c, type: 'lead'}));
        }
        if (recipientMode === 'custom' && customNumber.trim()) {
            return [{ id: 'custom', contact_name: 'Custom Recipient', phone: customNumber.trim(), type: 'custom' }];
        }
        return [];
    }, [recipientMode, selectedSingleId, selectedMultipleIds, selectedSegment, customNumber, crmContacts, currentUserId, contactId, contactName, contactPhoneE164, contactType]);

    const toggleMultipleContact = (id) => {
        setSelectedMultipleIds(prev => 
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const validateForm = () => {
        let isValid = true;
        const vErrors = {};

        if (effectiveRecipients.length === 0) {
            toast.error("Please select at least one recipient.");
            return false;
        }

        const remainingLimit = usage.limit - usage.count;
        if (effectiveRecipients.length > remainingLimit) {
            toast.error(`Limit exceeded. You can only send ${remainingLimit} more messages today.`);
            return false;
        }

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

    const handleSend = async (e) => {
        e.preventDefault();
        if (!validateForm() || !selectedTemplate || isSendingBulk) return;

        setIsSendingBulk(true);
        setSendResults(null);
        let successCount = 0;
        let failedCount = 0;
        let invalidCount = 0;

        for (const recipient of effectiveRecipients) {
            let cleanedPhone = recipient.phone?.trim() || '';
            if (!cleanedPhone.startsWith('+')) {
                cleanedPhone = '+' + cleanedPhone.replace(/\D/g, '');
            }
            if (!E164_REGEX.test(cleanedPhone)) {
                invalidCount++;
                continue;
            }

            // Resolve dynamic variables per recipient (simple replacement for 'name' fallback)
            const recipientVars = { ...variableValues };
            if (Array.isArray(selectedTemplate.variables)) {
                selectedTemplate.variables.forEach(varObj => {
                    if ((varObj.defaultFromContact === 'full_name' || varObj.defaultFromContact === 'contact_name' || varObj.key === 'name') && recipient.contact_name) {
                        recipientVars[varObj.key] = recipient.contact_name; // Override with actual name
                    }
                });
            }

            const isLead = recipient.type === 'lead';
            const payload = {
                templateId: selectedTemplate.id,
                templateName: selectedTemplate.name,
                templateLanguage: selectedTemplate.language || 'en',
                variables: recipientVars,
                recipientType: isLead ? 'contact' : 'custom_number',
                phoneE164: cleanedPhone
            };
            if (isLead) {
                payload.contactId = recipient.id;
            }

            const res = await sendTemplate(payload);
            if (res.success) {
                successCount++;
                // Optimistically update usage count
                setUsage(prev => ({ ...prev, count: prev.count + 1 }));
            } else {
                failedCount++;
            }
        }

        setIsSendingBulk(false);
        setSendResults({
            total: effectiveRecipients.length,
            success: successCount,
            failed: failedCount,
            invalid: invalidCount
        });

        if (successCount > 0) {
            toast.success(`Successfully sent ${successCount} messages!`);
            if (onSuccess) onSuccess();
        } else {
            toast.error("Failed to send messages.");
        }
    };

    if (!isOpen) return null;

    // Derived flags for template rendering
    const hasHeader = !!(selectedTemplate?.header && (selectedTemplate.header.text || selectedTemplate.header.format !== 'TEXT'));
    const hasFooter = !!selectedTemplate?.footer;
    const hasButtons = Array.isArray(selectedTemplate?.buttons) && selectedTemplate.buttons.length > 0;
    
    const isLimitReached = usage.count >= usage.limit;

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-sm transition-opacity">
            {/* Drawer Container */}
            <div
                role="dialog"
                aria-modal="true"
                className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 font-[family-name:var(--font-outfit)]"
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
                            <MessageSquare size={20} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                                    Send Template
                                </h3>
                                {selectedTemplate && (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-slate-100 text-slate-600 border border-slate-200">
                                        {selectedTemplate.title || selectedTemplate.name}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                                <p className="text-xs text-slate-500">
                                    Choose recipients and customize dynamic variables.
                                </p>
                                {!usage.loading && (
                                    <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${isLimitReached ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
                                        {usage.count} / {usage.limit} Today
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                {!selectedTemplate ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
                        <AlertCircle size={32} className="text-amber-500" />
                        <p className="text-sm font-semibold text-slate-700">No template selected.</p>
                        <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-white bg-slate-800 rounded-lg hover:bg-slate-900">
                            Back to Gallery
                        </button>
                    </div>
                ) : sendResults ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-6">
                        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-2">
                            <CheckCircle2 size={32} />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900">Send Complete</h2>
                        
                        <div className="grid grid-cols-3 gap-4 w-full max-w-sm">
                            <div className="bg-slate-50 p-4 rounded-xl text-center border border-slate-200">
                                <div className="text-2xl font-black text-emerald-600">{sendResults.success}</div>
                                <div className="text-[10px] font-bold text-slate-500 uppercase mt-1">Delivered</div>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-xl text-center border border-slate-200">
                                <div className="text-2xl font-black text-rose-600">{sendResults.failed}</div>
                                <div className="text-[10px] font-bold text-slate-500 uppercase mt-1">Failed</div>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-xl text-center border border-slate-200">
                                <div className="text-2xl font-black text-amber-600">{sendResults.invalid}</div>
                                <div className="text-[10px] font-bold text-slate-500 uppercase mt-1">Invalid No.</div>
                            </div>
                        </div>

                        <button onClick={onClose} className="px-6 py-2.5 mt-4 text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
                            Close Drawer
                        </button>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto flex flex-col md:flex-row">
                        {/* Left Side: Preview (Hidden on small screens, or stacked) */}
                        <div className="w-full md:w-1/3 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200 p-6 flex flex-col gap-4 shrink-0">
                            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">WhatsApp Preview</div>
                            <div className="bg-[#efeae2] p-3 rounded-xl border border-slate-200 shadow-inner flex-1 flex flex-col">
                                <div className="bg-white rounded-lg p-3 shadow-sm border border-slate-200/60 w-full relative">
                                    {hasHeader && (
                                        <div className="font-bold text-sm text-slate-900 mb-1">{selectedTemplate.header?.text || '[Media Header]'}</div>
                                    )}
                                    <TemplateMessagePreview
                                        text={selectedTemplate.text || selectedTemplate.body}
                                        variables={selectedTemplate.variables}
                                        variableValues={variableValues}
                                        highlightPlaceholders={true}
                                    />
                                    {hasFooter && (
                                        <div className="text-[10px] text-slate-400 mt-1 uppercase font-semibold">{selectedTemplate.footer}</div>
                                    )}
                                    <div className="text-[9px] text-slate-400 text-right mt-2 font-medium flex items-center justify-end gap-1">
                                        <span>Now</span>
                                        <CheckCircle2 size={10} className="text-emerald-500" />
                                    </div>
                                </div>
                                {hasButtons && (
                                    <div className="mt-2 space-y-1.5">
                                        {selectedTemplate.buttons.map((btn, idx) => (
                                            <div key={idx} className="bg-white py-1.5 px-3 rounded-lg border border-slate-200 text-center text-xs font-bold text-sky-600 shadow-sm">
                                                {btn.text}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right Side: Form */}
                        <div className="flex-1 p-6 space-y-6">
                            {/* Mode Selection */}
                            <div className="space-y-3">
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                                    1. Select Recipients
                                </label>
                                <div className="grid grid-cols-4 p-1 bg-slate-100 rounded-xl border border-slate-200 text-[11px] font-bold">
                                    <button onClick={() => handleModeSwitch('single')} className={`py-2 rounded-lg transition-all flex flex-col items-center justify-center gap-1 ${recipientMode === 'single' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                                        <User size={14} /> Single
                                    </button>
                                    <button onClick={() => handleModeSwitch('multiple')} className={`py-2 rounded-lg transition-all flex flex-col items-center justify-center gap-1 ${recipientMode === 'multiple' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                                        <CheckSquare size={14} /> Multiple
                                    </button>
                                    <button onClick={() => handleModeSwitch('segment')} className={`py-2 rounded-lg transition-all flex flex-col items-center justify-center gap-1 ${recipientMode === 'segment' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                                        <Filter size={14} /> Segment
                                    </button>
                                    <button onClick={() => handleModeSwitch('custom')} className={`py-2 rounded-lg transition-all flex flex-col items-center justify-center gap-1 ${recipientMode === 'custom' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                                        <Phone size={14} /> Custom
                                    </button>
                                </div>

                                {/* Mode Content */}
                                <div className="mt-4">
                                    {recipientMode === 'single' && (
                                        <select
                                            value={selectedSingleId}
                                            onChange={(e) => setSelectedSingleId(e.target.value)}
                                            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400"
                                        >
                                            <option value="">-- Search CRM Contacts --</option>
                                            {crmContacts.map(c => (
                                                <option key={c.id} value={c.id}>{c.contact_name} ({c.phone})</option>
                                            ))}
                                        </select>
                                    )}

                                    {recipientMode === 'multiple' && (
                                        <div className="border border-slate-200 rounded-xl max-h-48 overflow-y-auto bg-white p-2 space-y-1">
                                            {crmContacts.map(c => (
                                                <label key={c.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={selectedMultipleIds.includes(c.id)}
                                                        onChange={() => toggleMultipleContact(c.id)}
                                                        className="rounded text-slate-900 focus:ring-slate-900"
                                                    />
                                                    <div className="text-sm font-medium text-slate-800">
                                                        {c.contact_name} <span className="text-xs text-slate-400 ml-1">{c.phone}</span>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    )}

                                    {recipientMode === 'segment' && (
                                        <div className="grid grid-cols-2 gap-3">
                                            {[
                                                { id: 'all', label: 'All Contacts' },
                                                { id: 'my_leads', label: 'My Assigned Leads' },
                                                { id: 'active', label: 'Active Leads' },
                                                { id: 'converted', label: 'Converted Customers' },
                                            ].map(seg => (
                                                <button
                                                    key={seg.id}
                                                    onClick={() => setSelectedSegment(seg.id)}
                                                    className={`p-3 rounded-xl border text-left transition-all ${
                                                        selectedSegment === seg.id 
                                                        ? 'border-slate-900 bg-slate-900 text-white shadow-md' 
                                                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                                                    }`}
                                                >
                                                    <div className="text-xs font-bold">{seg.label}</div>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {recipientMode === 'custom' && (
                                        <div>
                                            <input
                                                type="text"
                                                placeholder="Enter phone number (e.g. +919876543210)"
                                                value={customNumber}
                                                onChange={(e) => setCustomNumber(e.target.value)}
                                                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400"
                                            />
                                            <p className="text-[10px] text-slate-500 mt-1.5 ml-1">Include country code. Example: +919876543210</p>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="text-[11px] font-semibold text-slate-500 mt-2 flex items-center gap-1.5">
                                    <Users size={12} />
                                    <span>{effectiveRecipients.length} Recipient(s) selected</span>
                                </div>
                            </div>

                            {/* Dynamic Variables Form */}
                            {Array.isArray(selectedTemplate.variables) && selectedTemplate.variables.length > 0 && (
                                <div className="space-y-4 pt-4 border-t border-slate-100">
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                                        2. Fill Template Variables
                                    </label>
                                    <div className="space-y-3">
                                        {selectedTemplate.variables.map((varObj, idx) => (
                                            <div key={varObj.key} className="space-y-1">
                                                <div className="flex justify-between items-center text-xs">
                                                    <label className="font-semibold text-slate-800">
                                                        {varObj.label || `Variable {{${idx + 1}}}`}
                                                        {varObj.required && <span className="text-rose-500 ml-0.5">*</span>}
                                                    </label>
                                                    <span className="text-[10px] font-mono text-slate-400">{`{{${idx + 1}}}`}</span>
                                                </div>
                                                <input
                                                    type="text"
                                                    placeholder={varObj.placeholder}
                                                    value={variableValues[varObj.key] || ''}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setVariableValues(prev => ({ ...prev, [varObj.key]: val }));
                                                        if (variableErrors[varObj.key]) {
                                                            setVariableErrors(prev => ({ ...prev, [varObj.key]: '' }));
                                                        }
                                                    }}
                                                    className={`w-full px-3.5 py-2.5 rounded-xl border ${
                                                        variableErrors[varObj.key] ? 'border-rose-300 bg-rose-50' : 'border-slate-200 bg-white'
                                                    } text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-400`}
                                                />
                                                {variableErrors[varObj.key] && (
                                                    <p className="text-[11px] font-semibold text-rose-600">{variableErrors[varObj.key]}</p>
                                                )}
                                                {(recipientMode !== 'single' && (varObj.defaultFromContact === 'full_name' || varObj.key === 'name')) && (
                                                    <p className="text-[10px] text-slate-500">Will automatically use each recipient&apos;s name.</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>
                )}

                {/* Footer Actions */}
                {!sendResults && selectedTemplate && (
                    <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
                        <div className="text-[11px] text-slate-500 font-medium">
                            Ready to send to {effectiveRecipients.length} contact(s)
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isSendingBulk}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSend}
                                disabled={isSendingBulk || effectiveRecipients.length === 0}
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
                            >
                                {isSendingBulk ? (
                                    <>
                                        <Loader2 size={15} className="animate-spin" />
                                        <span>Processing...</span>
                                    </>
                                ) : (
                                    <>
                                        <Send size={15} />
                                        <span>Send Now</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function SendWhatsAppDrawer(props) {
    return (
        <WhatsAppSenderErrorBoundary onClose={props.onClose}>
            <SendWhatsAppDrawerContent {...props} 
                contactType={props.contact?.type || 'lead'} // Pass type from parent standardizedContact if available
            />
        </WhatsAppSenderErrorBoundary>
    );
}
