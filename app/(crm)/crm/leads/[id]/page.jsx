'use client';

import { useState, useEffect, use } from 'react';
import { Phone, Mail, MapPin, Building, Calendar, Clock, Edit, FileText, Activity, MessageSquare } from 'lucide-react';
import Link from 'next/link';

export default function LeadDetailPage({ params }) {
    // React 19 best practice for accessing params in client components
    const unwrappedParams = use(params);
    const { id } = unwrappedParams;
    const [lead, setLead] = useState(null);

    useEffect(() => {
        // Mock fetch
        setTimeout(() => {
            setLead({
                id: id,
                name: 'Rahul Sharma',
                company: 'TechNova Solutions',
                phone: '+91 9876543210',
                email: 'rahul@technovasolutions.in',
                status: 'contacted',
                value: '₹1,50,000',
                source: 'Website Referral',
                location: 'Mumbai, MH',
                created: 'Oct 15, 2026',
                notes: 'Interested in the premium solar installation package. Requested a site visit next week.',
                timeline: [
                    { id: 1, type: 'call', title: 'Initial Discovery Call', date: 'Oct 16, 2026', time: '10:30 AM', desc: 'Discussed basic requirements and budget.' },
                    { id: 2, type: 'email', title: 'Sent Information Packet', date: 'Oct 16, 2026', time: '02:15 PM', desc: 'Emailed the premium tier PDF brochure.' },
                    { id: 3, type: 'status_change', title: 'Moved to Contacted', date: 'Oct 16, 2026', time: '02:20 PM', desc: '' }
                ]
            });
        }, 500);
    }, [id]);

    if (!lead) return (
        <div className="flex justify-center items-center h-[60vh]">
            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        </div>
    );

    const getStatusBadge = (status) => {
        const styles = {
            new: 'bg-blue-100 text-blue-700',
            contacted: 'bg-amber-100 text-amber-700',
            qualified: 'bg-indigo-100 text-indigo-700',
            proposal: 'bg-purple-100 text-purple-700',
            won: 'bg-emerald-100 text-emerald-700'
        };
        return <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${styles[status] || 'bg-gray-100'}`}>{status}</span>;
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/70 backdrop-blur-xl border border-white/50 p-6 rounded-3xl shadow-sm">
                <div className="flex items-center gap-5">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-700 text-2xl font-bold shadow-inner">
                        {lead.name.charAt(0)}
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-extrabold text-gray-900">{lead.name}</h1>
                            {getStatusBadge(lead.status)}
                        </div>
                        <p className="text-gray-500 font-medium">{lead.company}</p>
                    </div>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <button className="flex-1 sm:flex-none items-center justify-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-xl font-medium transition-all shadow-sm flex">
                        <Edit size={16} /> Edit
                    </button>
                    <button className="flex-1 sm:flex-none items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-medium transition-all shadow-lg shadow-indigo-500/30 flex">
                        <Phone size={16} /> Call
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Lead Info */}
                <div className="space-y-6">
                    {/* Contact Details */}
                    <div className="bg-white/70 backdrop-blur-xl border border-white/50 rounded-3xl p-6 shadow-sm">
                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><FileText size={18} className="text-indigo-500"/> Details</h3>
                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <Phone size={18} className="text-gray-400 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-gray-900">{lead.phone}</p>
                                    <p className="text-xs text-gray-500">Mobile</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Mail size={18} className="text-gray-400 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-gray-900">{lead.email}</p>
                                    <p className="text-xs text-gray-500">Work</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Building size={18} className="text-gray-400 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-gray-900">{lead.company}</p>
                                    <p className="text-xs text-gray-500">Company</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <MapPin size={18} className="text-gray-400 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-gray-900">{lead.location}</p>
                                    <p className="text-xs text-gray-500">Location</p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="mt-6 pt-6 border-t border-gray-100 space-y-4">
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Est. Value</p>
                                <p className="text-lg font-bold text-gray-900">{lead.value}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Source</p>
                                <p className="text-sm font-medium text-gray-900">{lead.source}</p>
                            </div>
                        </div>
                    </div>

                    {/* Quick Notes */}
                    <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-3xl p-6 shadow-sm">
                        <h3 className="font-bold text-indigo-900 mb-2">Internal Notes</h3>
                        <p className="text-sm text-indigo-800/80 leading-relaxed">{lead.notes}</p>
                    </div>
                </div>

                {/* Right Column: Activity Timeline */}
                <div className="lg:col-span-2 bg-white/70 backdrop-blur-xl border border-white/50 rounded-3xl p-6 shadow-sm flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2"><Activity size={18} className="text-indigo-500"/> Activity Timeline</h3>
                        <button className="text-sm font-medium text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                            <Plus size={16} /> Log Activity
                        </button>
                    </div>

                    <div className="relative flex-1 pl-4 border-l-2 border-gray-100 space-y-8 mt-2">
                        {lead.timeline.map((item, idx) => {
                            const icons = {
                                call: <Phone size={14} className="text-blue-600" />,
                                email: <Mail size={14} className="text-emerald-600" />,
                                status_change: <Activity size={14} className="text-amber-600" />
                            };
                            const bgColors = {
                                call: 'bg-blue-100 ring-blue-50',
                                email: 'bg-emerald-100 ring-emerald-50',
                                status_change: 'bg-amber-100 ring-amber-50'
                            };

                            return (
                                <div key={item.id} className="relative">
                                    {/* Timeline dot */}
                                    <div className={`absolute -left-[25px] w-6 h-6 rounded-full flex items-center justify-center ring-4 ${bgColors[item.type]}`}>
                                        {icons[item.type]}
                                    </div>
                                    
                                    <div className="bg-white border border-gray-100 p-4 rounded-2xl shadow-sm hover:shadow-md transition-shadow group">
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className="font-semibold text-gray-900">{item.title}</h4>
                                            <span className="text-xs text-gray-500 flex items-center gap-1">
                                                <Clock size={12} /> {item.time}
                                            </span>
                                        </div>
                                        {item.desc && <p className="text-sm text-gray-600 mt-2">{item.desc}</p>}
                                        <div className="mt-3 text-xs text-gray-400 font-medium">
                                            {item.date}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    
                    {/* Add note input */}
                    <div className="mt-6 flex gap-3 items-end">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0"></div>
                        <div className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl p-2 flex items-center focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                            <input 
                                type="text" 
                                placeholder="Add a note or log an activity..." 
                                className="w-full bg-transparent border-none focus:ring-0 px-3 py-1 text-sm text-gray-900"
                            />
                            <button className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-xl transition-colors shadow-sm">
                                <MessageSquare size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
