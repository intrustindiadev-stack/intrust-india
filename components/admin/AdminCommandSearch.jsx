'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, ArrowRight, CornerDownLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { NAV_ITEMS, QUICK_ACTIONS } from '@/lib/admin-search-index';
import { createClient } from '@/lib/supabaseClient';

export default function AdminCommandSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [merchants, setMerchants] = useState([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Keyboard shortcut (⌘K / Ctrl+K & Escape)
  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  // Debounced search for merchants
  useEffect(() => {
    if (query.trim().length < 2) {
      setMerchants([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('merchants')
          .select('id, business_name, business_email, user_id, user_profiles(email, full_name)')
          .or(`business_name.ilike.%${query}%`)
          .limit(5);
        
        if (data) {
          setMerchants(data.map(m => ({
            id: m.id,
            business_name: m.business_name,
            email: m.business_email || (m.user_profiles && m.user_profiles.email) || ''
          })));
        }
      } catch (err) {
        setMerchants([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (href) => {
    router.push(href);
    setOpen(false);
  };

  const filteredNav = useMemo(() => {
    if (!query.trim()) return NAV_ITEMS;
    const q = query.toLowerCase();
    return NAV_ITEMS.filter(item => 
      item.label.toLowerCase().includes(q) || 
      (item.keywords && item.keywords.toLowerCase().includes(q))
    );
  }, [query]);

  const filteredQuickActions = useMemo(() => {
    if (!query.trim()) return QUICK_ACTIONS;
    const q = query.toLowerCase();
    return QUICK_ACTIONS.filter(item => 
      item.label.toLowerCase().includes(q) || 
      (item.keywords && item.keywords.toLowerCase().includes(q))
    );
  }, [query]);

  const hasResults = filteredNav.length > 0 || filteredQuickActions.length > 0 || merchants.length > 0;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 w-64 lg:w-80 rounded-xl border border-slate-200
                   bg-slate-50 px-3 py-2 text-xs text-slate-400
                   hover:bg-slate-100 hover:text-slate-500 transition-colors duration-150"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Search or jump to…</span>
        <kbd className="pointer-events-none inline-flex items-center gap-0.5 rounded border border-slate-200
                        bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      {/* Icon-only variant for < md screens */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden flex items-center justify-center p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-500 transition-colors"
      >
        <Search className="h-5 w-5" />
      </button>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px]"
              onClick={() => setOpen(false)}
            />

            {/* Palette Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="relative z-50 w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Input Header */}
              <div className="flex items-center border-b border-slate-100 px-4 py-3">
                <Search className="mr-3 h-4 w-4 shrink-0 text-slate-400" />
                <input
                  autoFocus
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search commands, merchants, and pages..."
                  className="flex-1 text-sm outline-none placeholder:text-slate-400 text-slate-900 bg-transparent"
                />
                {query && (
                  <button onClick={() => setQuery('')} className="p-1 text-slate-400 hover:text-slate-600">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Content List */}
              <div className="max-h-[380px] overflow-y-auto p-3 space-y-4">
                {!hasResults ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No results found for &ldquo;{query}&rdquo;
                  </div>
                ) : (
                  <>
                    {/* Navigation */}
                    {filteredNav.length > 0 && (
                      <div>
                        <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Navigation
                        </div>
                        <div className="mt-1 space-y-0.5">
                          {filteredNav.map((item) => {
                            const Icon = item.icon;
                            return (
                              <button
                                key={item.id}
                                onClick={() => handleSelect(item.href)}
                                className="w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors text-left"
                              >
                                <div className="flex items-center gap-2.5">
                                  <Icon className="h-4 w-4 text-slate-400" />
                                  <span>{item.label}</span>
                                </div>
                                <ArrowRight className="h-3.5 w-3.5 text-slate-300" />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Quick Actions */}
                    {filteredQuickActions.length > 0 && (
                      <div>
                        <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Quick Actions
                        </div>
                        <div className="mt-1 space-y-0.5">
                          {filteredQuickActions.map((item) => (
                            <button
                              key={item.id}
                              onClick={() => handleSelect(item.href)}
                              className="w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors text-left"
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="h-2 w-2 rounded-full bg-blue-500" />
                                <span>{item.label}</span>
                              </div>
                              <ArrowRight className="h-3.5 w-3.5 text-slate-300" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Merchants */}
                    {merchants.length > 0 && (
                      <div>
                        <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Merchants
                        </div>
                        <div className="mt-1 space-y-0.5">
                          {merchants.map((merchant) => (
                            <button
                              key={merchant.id}
                              onClick={() => handleSelect(`/admin/merchants/${merchant.id}`)}
                              className="w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors text-left"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="h-6 w-6 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-[10px] shrink-0">
                                  {merchant.business_name?.charAt(0).toUpperCase()}
                                </div>
                                <div className="truncate">
                                  <div className="font-bold text-slate-900">{merchant.business_name}</div>
                                  {merchant.email && <div className="text-[10px] text-slate-400 truncate">{merchant.email}</div>}
                                </div>
                              </div>
                              <CornerDownLeft className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
