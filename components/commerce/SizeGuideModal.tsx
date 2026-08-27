'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Ruler, CheckCircle2 } from 'lucide-react';

interface SizeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  category?: string;
}

export default function SizeGuideModal({
  isOpen,
  onClose,
  category = 'Clothing'
}: SizeGuideModalProps) {
  const isWomen = category.toLowerCase().includes('women');

  const sizeChart = isWomen ? [
    { size: 'XS', bust: '32"', waist: '26"', hip: '35"', length: '38"' },
    { size: 'S',  bust: '34"', waist: '28"', hip: '37"', length: '39"' },
    { size: 'M',  bust: '36"', waist: '30"', hip: '39"', length: '40"' },
    { size: 'L',  bust: '38"', waist: '32"', hip: '41"', length: '41"' },
    { size: 'XL', bust: '40"', waist: '34"', hip: '43"', length: '42"' },
    { size: 'XXL',bust: '42"', waist: '36"', hip: '45"', length: '43"' },
  ] : [
    { size: 'S',  chest: '38"', waist: '30"', shoulder: '17.5"', length: '28"' },
    { size: 'M',  chest: '40"', waist: '32"', shoulder: '18.0"', length: '29"' },
    { size: 'L',  chest: '42"', waist: '34"', shoulder: '18.5"', length: '30"' },
    { size: 'XL', chest: '44"', waist: '36"', shoulder: '19.0"', length: '31"' },
    { size: 'XXL',chest: '46"', waist: '38"', shoulder: '19.5"', length: '32"' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-gray-800 z-10 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-gray-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Ruler size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Standard Size Guide
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-gray-400">
                    All measurements are in inches
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-gray-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Table */}
            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-gray-800 text-slate-400 dark:text-gray-500 uppercase tracking-wider text-[10px]">
                    <th className="pb-3 font-black">Size</th>
                    {isWomen ? (
                      <>
                        <th className="pb-3 font-black">Bust</th>
                        <th className="pb-3 font-black">Waist</th>
                        <th className="pb-3 font-black">Hip</th>
                        <th className="pb-3 font-black">Length</th>
                      </>
                    ) : (
                      <>
                        <th className="pb-3 font-black">Chest</th>
                        <th className="pb-3 font-black">Waist</th>
                        <th className="pb-3 font-black">Shoulder</th>
                        <th className="pb-3 font-black">Length</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-gray-800/60 font-semibold text-slate-700 dark:text-gray-200">
                  {sizeChart.map((row) => (
                    <tr key={row.size} className="hover:bg-slate-50 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="py-3 font-black text-blue-600 dark:text-blue-400">{row.size}</td>
                      {isWomen ? (
                        <>
                          <td className="py-3">{(row as any).bust}</td>
                          <td className="py-3">{(row as any).waist}</td>
                          <td className="py-3">{(row as any).hip}</td>
                          <td className="py-3">{(row as any).length}</td>
                        </>
                      ) : (
                        <>
                          <td className="py-3">{(row as any).chest}</td>
                          <td className="py-3">{(row as any).waist}</td>
                          <td className="py-3">{(row as any).shoulder}</td>
                          <td className="py-3">{(row as any).length}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* How to measure tip */}
            <div className="mt-5 p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 text-[11px] text-slate-600 dark:text-gray-300 flex items-start gap-2">
              <CheckCircle2 size={15} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <span>
                <strong>Fit Tip:</strong> If your measurements fall between two sizes, choose the smaller size for a tighter fit or the larger size for a relaxed, comfortable drape.
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
