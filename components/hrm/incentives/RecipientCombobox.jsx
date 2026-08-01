'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, User, Users, Check, ChevronDown, Loader2 } from 'lucide-react';

export default function RecipientCombobox({ mode = 'individual', value, onChange, placeholder = 'Search recipient...' }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState([]);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/hrm/incentives/recipients?search=${encodeURIComponent(query)}&limit=25`);
        const data = await res.json();
        if (isMounted && data.success) {
          if (mode === 'individual') {
            setOptions(data.employees || []);
          } else {
            setOptions(data.teams || []);
          }
        }
      } catch (err) {
        console.error('Fetch recipients error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }, 250);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [query, mode]);

  const selectedOption = options.find((o) => o.id === value);
  const selectedLabel = selectedOption
    ? mode === 'individual'
      ? selectedOption.full_name
      : selectedOption.name
    : '';

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg shadow-xs hover:border-slate-300 focus-within:ring-2 focus-within:ring-slate-900 cursor-pointer text-sm"
      >
        <div className="flex items-center gap-2 truncate">
          {mode === 'individual' ? <User size={16} className="text-slate-400 shrink-0" /> : <Users size={16} className="text-slate-400 shrink-0" />}
          <span className={selectedLabel ? 'text-slate-900 font-medium truncate' : 'text-slate-400 truncate'}>
            {selectedLabel || placeholder}
          </span>
        </div>
        <ChevronDown size={16} className="text-slate-400 shrink-0 ml-2" />
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-hidden flex flex-col">
          <div className="p-2 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
            <Search size={14} className="text-slate-400 ml-1 shrink-0" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Type to search ${mode === 'individual' ? 'employees' : 'teams'}...`}
              className="w-full text-xs outline-none bg-transparent text-slate-800 placeholder-slate-400"
            />
            {loading && <Loader2 size={14} className="animate-spin text-slate-400 shrink-0" />}
          </div>

          <div className="overflow-y-auto max-h-48 divide-y divide-slate-50">
            {options.length === 0 && !loading && (
              <div className="p-4 text-xs text-center text-slate-400">
                No matching {mode === 'individual' ? 'employees' : 'teams'} found.
              </div>
            )}
            {options.map((opt) => {
              const isSelected = opt.id === value;
              const title = mode === 'individual' ? opt.full_name : opt.name;
              const sub = mode === 'individual'
                ? `${opt.employee_id ? `#${opt.employee_id} · ` : ''}${opt.email || ''}`
                : `${opt.region_level?.toUpperCase() || ''} · ${opt.state || ''}`;

              return (
                <div
                  key={opt.id}
                  onClick={() => {
                    onChange(opt.id, opt);
                    setIsOpen(false);
                  }}
                  className={`px-3.5 py-2.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer text-xs transition-colors ${
                    isSelected ? 'bg-slate-50 font-semibold text-slate-900' : 'text-slate-700'
                  }`}
                >
                  <div>
                    <p className="font-medium text-slate-900">{title}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>
                  </div>
                  {isSelected && <Check size={14} className="text-slate-900 shrink-0" />}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
