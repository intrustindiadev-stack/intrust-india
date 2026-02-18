'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Gift, CreditCard, Sun, Smartphone, ShoppingBag, Plane } from 'lucide-react';
<<<<<<< HEAD
import { useLanguage } from '@/lib/i18n/LanguageContext';
=======
>>>>>>> origin/yogesh-final

const categories = [
    { id: 'gift-cards', label: 'Gift Cards', icon: Gift, href: '/gift-cards' },
    { id: 'loans', label: 'Loans', icon: CreditCard, href: '/loans' },
    { id: 'solar', label: 'Solar', icon: Sun, href: '/solar' },
    { id: 'recharge', label: 'Recharge', icon: Smartphone, href: '/recharge' },
    { id: 'shopping', label: 'Shopping', icon: ShoppingBag, href: '/shopping' },
    { id: 'travel', label: 'Travel', icon: Plane, href: '/travel' },
];

export default function CategoryGrid() {
<<<<<<< HEAD
    const { t } = useLanguage();
=======
>>>>>>> origin/yogesh-final

    return (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4 md:gap-6 w-full max-w-4xl mx-auto mt-10 px-4 justify-items-center">
            {categories.map((cat, idx) => {
                const Icon = cat.icon;
                // Correct label usage with fallback
                const key = `hero.categories.${cat.id.replace('-', '')}`;
                const translation = t(key);
                const label = (translation && translation !== key) ? translation : cat.label;

                return (
                    <Link href={cat.href} key={cat.id} className="group">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 + (idx * 0.05), duration: 0.4, ease: "easeOut" }}
                            whileHover={{
                                y: -4,
                                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)"
                            }}
                            className="
                flex flex-col items-center justify-center gap-3
                w-[110px] sm:w-[124px] 
                py-4 px-2
                bg-white/70 
                border border-gray-200/40
                rounded-xl
                shadow-sm
                transition-all duration-300
                cursor-pointer
              "
                        >
                            {/* Icon - Minimal Brand Blue */}
                            <div
                                className="
                  text-blue-600 
                  group-hover:text-blue-700 
                  transition-colors duration-300
                "
                            >
                                <Icon
                                    size={26} // w-6.5 h-6.5 eq
                                    strokeWidth={1.5}
                                />
                            </div>

                            {/* Label - Clean Typography */}
                            <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900 transition-colors text-center leading-tight tracking-tight">
                                {label}
                            </span>
                        </motion.div>
                    </Link>
                );
            })}
        </div>
    );
}
