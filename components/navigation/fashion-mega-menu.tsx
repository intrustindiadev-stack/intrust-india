'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Search, ShoppingBag, Menu, X } from 'lucide-react';
import type { CategoryNode } from '../../lib/fashion/categories';
import Image from 'next/image';

interface FashionMegaMenuProps {
  categories: CategoryNode[];
}

export default function FashionMegaMenu({ categories }: FashionMegaMenuProps) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menu on Escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setActiveMenu(null);
        setIsMobileOpen(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleMouseEnter = (id: string) => {
    if (window.innerWidth > 1024) setActiveMenu(id);
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-[var(--fashion-color-bg)] border-b border-[var(--fashion-color-border)] shadow-sm">
      <div className="max-w-[var(--fashion-container-max)] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-[var(--fashion-header-height)]">
          {/* Mobile Menu Trigger */}
          <button 
            className="lg:hidden p-2 text-[var(--fashion-color-text)] hover:bg-[var(--fashion-color-surface)] rounded-md"
            onClick={() => setIsMobileOpen(true)}
            aria-label="Open Menu"
            aria-expanded={isMobileOpen}
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Logo */}
          <Link href="/shop/fashion" className="flex-shrink-0 flex items-center">
            <span className="text-2xl font-bold uppercase tracking-wider text-[var(--fashion-color-text)]">
              FASHION
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex space-x-8" ref={menuRef} aria-label="Main Navigation">
            {categories.map((cat) => (
              <div 
                key={cat.id} 
                className="relative"
                onMouseEnter={() => handleMouseEnter(cat.id)}
                onMouseLeave={() => setActiveMenu(null)}
              >
                <button
                  className="flex items-center space-x-1 py-6 text-[var(--fashion-color-text)] hover:text-[var(--fashion-color-text-muted)] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fashion-color-accent)]"
                  aria-expanded={activeMenu === cat.id}
                  onClick={() => setActiveMenu(activeMenu === cat.id ? null : cat.id)}
                >
                  <span>{cat.name}</span>
                  <ChevronDown className="w-4 h-4" />
                </button>

                {/* Dropdown Panel */}
                <AnimatePresence>
                  {activeMenu === cat.id && cat.children && cat.children.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.2 }}
                      className="absolute top-full left-1/2 -translate-x-1/2 w-[800px] bg-[var(--fashion-color-bg)] shadow-[var(--fashion-shadow-overlay)] border border-[var(--fashion-color-border)] rounded-b-lg p-8 grid grid-cols-4 gap-8"
                      role="menu"
                    >
                      {/* Subcategories (L2 & L3) */}
                      <div className="col-span-3 grid grid-cols-3 gap-6">
                        {cat.children.map((sub) => (
                          <div key={sub.id} className="space-y-4">
                            <Link 
                              href={`/shop/fashion/${sub.path}`}
                              className="font-semibold text-lg text-[var(--fashion-color-text)] hover:underline"
                              role="menuitem"
                            >
                              {sub.name}
                            </Link>
                            {sub.children && sub.children.length > 0 && (
                              <ul className="space-y-2">
                                {sub.children.map((child) => (
                                  <li key={child.id}>
                                    <Link 
                                      href={`/shop/fashion/${child.path}`}
                                      className="text-[var(--fashion-color-text-muted)] hover:text-[var(--fashion-color-text)] transition-colors"
                                      role="menuitem"
                                    >
                                      {child.name}
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Promo Block */}
                      <div className="col-span-1 bg-[var(--fashion-color-surface)] p-4 rounded-lg flex flex-col items-center text-center">
                        <div className="w-full h-40 relative bg-gray-200 mb-4 rounded-md overflow-hidden">
                          {cat.banner_url ? (
                            <Image src={cat.banner_url} alt={cat.banner_alt || cat.name} fill className="object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-500">Promo</div>
                          )}
                        </div>
                        <h4 className="font-semibold text-[var(--fashion-color-text)] mb-2">New Arrivals</h4>
                        <Link 
                          href={`/shop/fashion/${cat.path}?sort=newest`}
                          className="text-sm font-medium underline text-[var(--fashion-color-text)]"
                          role="menuitem"
                        >
                          Shop Now
                        </Link>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center space-x-4">
            <button className="p-2 text-[var(--fashion-color-text)] hover:bg-[var(--fashion-color-surface)] rounded-md" aria-label="Search">
              <Search className="w-5 h-5" />
            </button>
            <button className="p-2 text-[var(--fashion-color-text)] hover:bg-[var(--fashion-color-surface)] rounded-md relative" aria-label="Cart">
              <ShoppingBag className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-[var(--fashion-color-danger)] rounded-full"></span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-[60] lg:hidden"
              onClick={() => setIsMobileOpen(false)}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="fixed inset-y-0 left-0 w-[80%] max-w-sm bg-[var(--fashion-color-bg)] shadow-xl z-[70] lg:hidden flex flex-col"
              role="dialog"
              aria-modal="true"
              aria-label="Mobile Navigation"
            >
              <div className="flex justify-between items-center p-4 border-b border-[var(--fashion-color-border)]">
                <span className="text-xl font-bold uppercase">Menu</span>
                <button 
                  onClick={() => setIsMobileOpen(false)}
                  className="p-2 hover:bg-[var(--fashion-color-surface)] rounded-md"
                  aria-label="Close Menu"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto py-4">
                {categories.map((cat) => (
                  <div key={cat.id} className="border-b border-[var(--fashion-color-border)] px-4 py-2">
                    <Link 
                      href={`/shop/fashion/${cat.path}`}
                      className="block py-2 text-lg font-semibold text-[var(--fashion-color-text)]"
                      onClick={() => setIsMobileOpen(false)}
                    >
                      {cat.name}
                    </Link>
                    {cat.children && (
                      <ul className="pl-4 pb-2 space-y-2">
                        {cat.children.map((sub) => (
                          <li key={sub.id}>
                            <Link 
                              href={`/shop/fashion/${sub.path}`}
                              className="block py-1 text-[var(--fashion-color-text-muted)]"
                              onClick={() => setIsMobileOpen(false)}
                            >
                              {sub.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
