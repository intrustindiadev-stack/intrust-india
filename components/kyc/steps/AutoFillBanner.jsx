'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';

/**
 * Glass-morphism auto-fill banner shown after PAN verification.
 *
 * @typedef {Object} AutoFillBannerProps
 * @property {string} name - Verified name from PAN
 * @property {boolean} visible
 */

/** @param {AutoFillBannerProps} props */
export default function AutoFillBanner({ name, visible }) {
    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ opacity: 0, y: -16, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -16, height: 0 }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                    className="overflow-hidden"
                >
                    <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl p-4 flex items-start gap-3 shadow-sm">
                        <div className="bg-[#DCFCE7] p-2 rounded-lg shrink-0">
                            <ShieldCheck size={18} className="text-[#16A34A]" />
                        </div>
                        <div>
                            <p className="text-[#16A34A] font-semibold text-[15px]">
                                Details auto-filled from PAN
                            </p>
                            <p className="text-[#15803D] text-[13px] mt-1 leading-snug">
                                Name &amp; Date of Birth verified as<br />
                                <span className="font-bold text-[#14532D]">{name}</span>
                            </p>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
