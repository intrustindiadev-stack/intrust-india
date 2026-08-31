'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { Command } from 'cmdk';
import { motion, AnimatePresence } from 'framer-motion';
import * as Dialog from '@radix-ui/react-dialog';
import { NAV_ITEMS, QUICK_ACTIONS } from '@/lib/admin-search-index';
import { createClient } from '@/lib/supabaseClient';

export default function AdminCommandSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [merchants, setMerchants] = useState([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Keyboard shortcut
  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  // Debounced search for merchants
  useEffect(() => {
    if (query.length < 2) {
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
        // Silently return [] on error
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

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 w-64 lg:w-80 rounded-lg border border-[#EAEFF4]
                   bg-slate-50 px-3 py-1.5 text-sm text-slate-400
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
        className="md:hidden flex items-center justify-center p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-500 transition-colors"
      >
        <Search className="h-5 w-5" />
      </button>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/20 backdrop-blur-[2px]
                                     data-[state=open]:animate-in data-[state=open]:fade-in-0" />
          <Dialog.Content asChild>
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -4 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="fixed left-1/2 top-[18%] z-50 w-full max-w-xl -translate-x-1/2
                         rounded-xl border border-[#EAEFF4] bg-white shadow-xl overflow-hidden"
            >
              <Command label="Admin command palette" shouldFilter={true} className="flex h-full w-full flex-col overflow-hidden bg-white rounded-xl">
                <div className="flex items-center border-b border-[#EAEFF4] px-3">
                  <Search className="mr-2 h-4 w-4 shrink-0 text-slate-400" />
                  <Command.Input 
                    value={query}
                    onValueChange={setQuery}
                    placeholder="Search commands, merchants, and pages..."
                    className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-50 text-slate-900" 
                  />
                </div>
                <Command.List className="max-h-[380px] overflow-y-auto overflow-x-hidden p-2 hide-scrollbar">
                  <Command.Empty className="py-6 text-center text-sm text-slate-400">
                    No results for "{query}"
                  </Command.Empty>

                  <Command.Group heading="Navigation" className="px-2 text-xs font-semibold text-slate-500 mb-2 mt-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
                    {NAV_ITEMS.map(item => {
                      const Icon = item.icon;
                      return (
                        <Command.Item
                          key={item.id}
                          onSelect={() => handleSelect(item.href)}
                          keywords={[item.label, ...item.keywords.split(' ')]}
                          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-600 aria-selected:bg-slate-100 aria-selected:text-slate-900 cursor-pointer mb-1"
                        >
                          <Icon className="h-4 w-4 text-slate-400" />
                          {item.label}
                        </Command.Item>
                      );
                    })}
                  </Command.Group>

                  <Command.Group heading="Quick Actions" className="px-2 text-xs font-semibold text-slate-500 mb-2 mt-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
                    {QUICK_ACTIONS.map(item => (
                      <Command.Item
                        key={item.id}
                        onSelect={() => handleSelect(item.href)}
                        keywords={[item.label, ...item.keywords.split(' ')]}
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-600 aria-selected:bg-slate-100 aria-selected:text-slate-900 cursor-pointer mb-1"
                      >
                        <div className="h-4 w-4 rounded-full bg-slate-100 border border-slate-200" />
                        {item.label}
                      </Command.Item>
                    ))}
                  </Command.Group>

                  {query.length >= 2 && merchants.length > 0 && (
                    <Command.Group heading="Merchants" className="px-2 text-xs font-semibold text-slate-500 mb-2 mt-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
                      {merchants.map(merchant => (
                        <Command.Item
                          key={merchant.id}
                          onSelect={() => handleSelect(`/admin/merchants/${merchant.id}`)}
                          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-600 aria-selected:bg-slate-100 aria-selected:text-slate-900 cursor-pointer mb-1"
                        >
                          <div className="h-4 w-4 rounded-full bg-blue-100 text-blue-500 flex items-center justify-center font-bold text-[8px]">
                            {merchant.business_name?.charAt(0).toUpperCase()}
                          </div>
                          <span className="flex-1 truncate">{merchant.business_name}</span>
                          {merchant.email && <span className="text-xs text-slate-400 truncate max-w-[150px]">{merchant.email}</span>}
                        </Command.Item>
                      ))}
                    </Command.Group>
                  )}
                </Command.List>
              </Command>
            </motion.div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
