'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

export default function SidebarGroup({ id, label, defaultOpen = false, children }) {
  const storageKey = `admin-sidebar-group:${id}`;
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved !== null) {
      setOpen(saved === 'true');
    } else if (defaultOpen) {
      setOpen(true);
    }
  }, [storageKey, defaultOpen]);
  
  // If defaultOpen becomes true from props (e.g. active route matched), make sure it's open
  useEffect(() => {
    if (defaultOpen) {
       setOpen(true);
    }
  }, [defaultOpen]);

  const toggle = () => {
    setOpen((prev) => {
      localStorage.setItem(storageKey, String(!prev));
      return !prev;
    });
  };

  return (
    <div>
      <button
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-3 py-2
                   text-[11px] font-semibold uppercase tracking-wider text-slate-400
                   hover:text-slate-600 transition-colors duration-150"
      >
        {label}
        <ChevronRight
          className={`h-3.5 w-3.5 transition-transform duration-200 ease-in-out
                      ${open ? 'rotate-90' : ''}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <motion.ul
              initial="closed"
              animate="open"
              variants={{
                open: { transition: { staggerChildren: 0.02 } },
                closed: {},
              }}
              className="space-y-0.5 pb-2 m-0 p-0"
            >
              {children}
            </motion.ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
