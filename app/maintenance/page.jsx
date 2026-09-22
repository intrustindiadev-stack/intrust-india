'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { 
  ShieldCheck, 
  Server, 
  Clock, 
  RefreshCw, 
  Mail, 
  CheckCircle2, 
  Activity,
  AlertTriangle,
  Bell,
  Send,
  MessageSquare
} from 'lucide-react';

export default function MaintenancePage() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notifyType, setNotifyType] = useState('whatsapp');
  const [contactValue, setContactValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [subscribeStatus, setSubscribeStatus] = useState(null);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      window.location.reload();
    }, 400);
  };

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!contactValue.trim()) return;

    setIsSubmitting(true);
    setSubscribeStatus(null);

    try {
      const res = await fetch('/api/maintenance/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactType: notifyType,
          contactValue: contactValue.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSubscribeStatus({ success: true, message: data.message });
        setContactValue('');
      } else {
        setSubscribeStatus({ success: false, message: data.error || 'Failed to submit. Please try again.' });
      }
    } catch (err) {
      setSubscribeStatus({ success: false, message: 'Network error. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] bg-[#070b14] text-slate-100 flex flex-col justify-between selection:bg-blue-600/30 selection:text-blue-300 relative overflow-x-hidden font-sans">
      {/* Background ambient lighting effects */}
      <div 
        aria-hidden="true" 
        className="pointer-events-none absolute -top-32 sm:-top-40 left-1/2 -translate-x-1/2 w-[340px] sm:w-[720px] h-[360px] sm:h-[520px] bg-gradient-to-b from-blue-600/20 via-indigo-600/10 to-transparent blur-2xl sm:blur-3xl opacity-70"
      />
      <div 
        aria-hidden="true" 
        className="pointer-events-none absolute -bottom-32 sm:-bottom-40 right-0 sm:right-10 w-[280px] sm:w-[500px] h-[280px] sm:h-[500px] bg-gradient-to-t from-amber-500/10 via-blue-500/5 to-transparent blur-2xl sm:blur-3xl opacity-40"
      />

      {/* Header with InTrust India Brand */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 sm:gap-3.5">
          <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-white/10 p-1.5 flex items-center justify-center border border-white/15 shadow-lg shadow-blue-500/10 backdrop-blur-md shrink-0 overflow-hidden">
            <Image
              src="/icons/intrustLogo.png"
              alt="InTrust India Logo"
              width={32}
              height={32}
              className="object-contain w-7 h-7 sm:w-8 sm:h-8"
              priority
            />
          </div>
          <div className="flex flex-col">
            <span className="font-black text-lg sm:text-2xl tracking-tight text-white leading-none">
              InTrust <span className="text-blue-400">India</span>
            </span>
            <span className="text-[9px] sm:text-[10px] font-bold tracking-widest text-slate-400 uppercase mt-0.5 sm:mt-1">
              Official Platform
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-[11px] sm:text-xs font-medium text-slate-300 shadow-inner whitespace-nowrap">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
          <span className="hidden xs:inline">System Maintenance</span>
          <span className="xs:hidden">Maintenance</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-6 py-6 sm:py-10">
        <div className="max-w-3xl w-full mx-auto text-center">
          
          {/* Centered Brand Emblem */}
          <div className="mx-auto mb-4 sm:mb-6 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-gradient-to-b from-blue-500/20 to-indigo-500/5 border border-blue-500/30 flex items-center justify-center shadow-2xl shadow-blue-500/20 backdrop-blur-md p-2.5 sm:p-3">
            <Image
              src="/icons/intrustLogo.png"
              alt="InTrust Logo"
              width={48}
              height={48}
              className="object-contain w-10 h-10 sm:w-12 sm:h-12"
              priority
            />
          </div>

          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs sm:text-sm font-medium mb-4 sm:mb-6 backdrop-blur-sm shadow-sm max-w-full">
            <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0" />
            <span className="truncate">Scheduled Infrastructure Maintenance</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-white mb-3 sm:mb-5 leading-tight sm:leading-tight">
            System Maintenance
          </h1>

          {/* Subtitle / Message */}
          <p className="text-xs sm:text-base md:text-lg text-slate-300 max-w-2xl mx-auto mb-5 sm:mb-6 leading-relaxed px-1 sm:px-0">
            The InTrust India platform is temporarily offline while we perform scheduled infrastructure optimizations and system-wide upgrades.
          </p>

          {/* Professional 12-24 Hours Window Callout */}
          <div className="max-w-xl mx-auto mb-6 sm:mb-8 p-3.5 sm:p-4 md:p-5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-blue-950/70 via-slate-900/90 to-blue-950/70 border border-blue-500/30 backdrop-blur-md flex items-center gap-3 sm:gap-4 text-left shadow-xl shadow-blue-950/40">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] sm:text-xs text-blue-300 font-bold uppercase tracking-wider">
                Estimated Downtime
              </p>
              <p className="text-xs sm:text-sm md:text-base text-white font-medium leading-snug sm:leading-normal">
                Our services are expected to be back online within <span className="text-amber-300 font-bold underline decoration-amber-400/40 decoration-2 underline-offset-2">12 to 24 hours</span>.
              </p>
            </div>
          </div>

          {/* Visitor "Notify Me" Box */}
          <div className="max-w-xl mx-auto mb-8 p-4 sm:p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-2xl backdrop-blur-md text-left">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Bell className="w-4 h-4" />
              </div>
              <h2 className="text-sm sm:text-base font-bold text-white">
                Get Notified When We're Back Online
              </h2>
            </div>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Drop your WhatsApp number or email below to receive an instant alert the moment InTrust India is back live.
            </p>

            {subscribeStatus ? (
              <div className={`p-3.5 rounded-xl text-xs sm:text-sm flex items-start gap-2.5 ${subscribeStatus.success ? 'bg-emerald-950/50 border border-emerald-500/30 text-emerald-300' : 'bg-rose-950/50 border border-rose-500/30 text-rose-300'}`}>
                {subscribeStatus.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" /> : <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />}
                <div className="flex-1">
                  <span>{subscribeStatus.message}</span>
                  {subscribeStatus.success && (
                    <button
                      type="button"
                      onClick={() => setSubscribeStatus(null)}
                      className="block text-[11px] text-emerald-400 underline mt-1 cursor-pointer"
                    >
                      Subscribe another contact
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="space-y-3">
                {/* Toggle Channels */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { setNotifyType('whatsapp'); setContactValue(''); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${notifyType === 'whatsapp' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-800/80 text-slate-400 hover:text-white'}`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setNotifyType('email'); setContactValue(''); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${notifyType === 'email' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-800/80 text-slate-400 hover:text-white'}`}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Email</span>
                  </button>
                </div>

                {/* Input with inline submit */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    {notifyType === 'whatsapp' ? (
                      <div className="flex items-center rounded-xl bg-slate-950/80 border border-slate-700/80 focus-within:border-emerald-500 overflow-hidden transition-colors">
                        <span className="px-3 text-xs font-bold text-slate-400 select-none border-r border-slate-800">
                          +91
                        </span>
                        <input
                          type="tel"
                          value={contactValue}
                          onChange={(e) => setContactValue(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          placeholder="10-digit mobile number"
                          className="w-full bg-transparent px-3 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none"
                          required
                        />
                      </div>
                    ) : (
                      <div className="flex items-center rounded-xl bg-slate-950/80 border border-slate-700/80 focus-within:border-blue-500 overflow-hidden transition-colors">
                        <span className="px-3 text-slate-500">
                          <Mail className="w-4 h-4" />
                        </span>
                        <input
                          type="email"
                          value={contactValue}
                          onChange={(e) => setContactValue(e.target.value)}
                          placeholder="name@example.com"
                          className="w-full bg-transparent pr-3 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none"
                          required
                        />
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || !contactValue.trim()}
                    className={`px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm text-white flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 ${notifyType === 'whatsapp' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-blue-600 hover:bg-blue-500'}`}
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Notify Me</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Assurance Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-left mb-8 sm:mb-12">
            <div className="p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm hover:border-slate-700/80 transition-colors">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-3 sm:mb-4">
                <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <h3 className="font-semibold text-white text-sm sm:text-base mb-1">
                Data &amp; Funds Safe
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                All account records, wallet balances, and active transactions remain fully secured and encrypted.
              </p>
            </div>

            <div className="p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm hover:border-slate-700/80 transition-colors">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3 sm:mb-4">
                <Server className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <h3 className="font-semibold text-white text-sm sm:text-base mb-1">
                Core Optimization
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Upgrading database clusters and high-throughput microservices for zero-latency operations.
              </p>
            </div>

            <div className="p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm hover:border-slate-700/80 transition-colors">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3 sm:mb-4">
                <Activity className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <h3 className="font-semibold text-white text-sm sm:text-base mb-1">
                Active Deployment
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Our infrastructure and site reliability teams are actively verifying system health.
              </p>
            </div>
          </div>

          {/* Interactive Actions (Full width on mobile for tap friendliness) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 max-w-sm sm:max-w-none mx-auto">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 sm:py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-sm transition-all duration-200 shadow-lg shadow-blue-600/25 active:scale-[0.98] disabled:opacity-75 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Checking Status...' : 'Check Status Again'}</span>
            </button>

            <a
              href="mailto:hello@intrustindia.com"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 sm:py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 font-medium text-sm transition-all duration-200 hover:text-white"
            >
              <Mail className="w-4 h-4 text-slate-400" />
              <span>Contact Support</span>
            </a>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 border-t border-slate-900/80 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 text-[11px] sm:text-xs text-slate-500 text-center sm:text-left">
        <div className="flex items-center gap-2">
          <span>&copy; {new Date().getFullYear()} InTrust India. All rights reserved.</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6">
          <span className="inline-flex items-center gap-1.5 text-slate-400">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Zero Data Loss Guarantee
          </span>
          <span className="hidden sm:inline text-slate-700">|</span>
          <span>Status Code: 503 Maintenance</span>
        </div>
      </footer>
    </div>
  );
}
