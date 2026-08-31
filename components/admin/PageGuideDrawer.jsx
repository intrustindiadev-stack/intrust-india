'use client';
import { motion, AnimatePresence } from 'framer-motion';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Lightbulb } from 'lucide-react';

export default function PageGuideDrawer({ guide, open, onOpenChange }) {
  if (!guide) return null;

  const Icon = guide.icon;

  const getBadgeClasses = (tone) => {
    switch (tone) {
      case 'green': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'red': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'amber': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'indigo': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'slate': return 'bg-slate-100 text-slate-700 border-slate-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-50 bg-slate-900/20 backdrop-blur-[2px]"
              />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount>
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
                className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white
                           border-l border-slate-200 shadow-xl flex flex-col focus:outline-none overflow-y-auto"
              >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                      <Icon className="h-5 w-5" />
                    </div>
                    <Dialog.Title className="text-lg font-bold text-slate-900">
                      {guide.title}
                    </Dialog.Title>
                  </div>
                  <Dialog.Close asChild>
                    <button className="p-2 -mr-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                      <X className="h-5 w-5" />
                    </button>
                  </Dialog.Close>
                </div>

                {/* Body Sections */}
                <div className="p-6 flex-1 flex flex-col gap-8">
                  {/* Overview */}
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}>
                    <h3 className="text-sm font-bold text-slate-900 mb-2">What this page does</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {guide.overview}
                    </p>
                  </motion.div>

                  {/* Key Actions */}
                  {guide.keyActions?.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
                      <h3 className="text-sm font-bold text-slate-900 mb-3">Key actions</h3>
                      <ol className="space-y-4 list-decimal list-outside ml-4">
                        {guide.keyActions.map((action, idx) => (
                          <li key={idx} className="text-sm pl-1">
                            <span className="font-medium text-slate-800 block">{action.label}</span>
                            <span className="text-slate-500 mt-0.5 block">{action.description}</span>
                          </li>
                        ))}
                      </ol>
                    </motion.div>
                  )}

                  {/* Statuses & metrics */}
                  {guide.glossary?.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
                      <h3 className="text-sm font-bold text-slate-900 mb-3">Statuses & metrics</h3>
                      <div className="space-y-4">
                        {guide.glossary.map((item, idx) => (
                          <div key={idx} className="flex flex-col gap-1.5">
                            <div>
                              {item.badgeTone ? (
                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border ${getBadgeClasses(item.badgeTone)}`}>
                                  <span className={`h-1.5 w-1.5 rounded-full ${item.badgeTone === 'green' ? 'bg-emerald-500' : item.badgeTone === 'red' ? 'bg-rose-500' : item.badgeTone === 'amber' ? 'bg-amber-500' : item.badgeTone === 'indigo' ? 'bg-indigo-500' : 'bg-slate-500'}`} />
                                  {item.term}
                                </span>
                              ) : (
                                <span className="text-sm font-medium text-slate-800">{item.term}</span>
                              )}
                            </div>
                            <p className="text-sm text-slate-500 leading-snug">{item.meaning}</p>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Quick Tips */}
                  {guide.tips?.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
                      <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                        <div className="flex items-center gap-2 mb-3">
                          <Lightbulb className="h-4 w-4 text-amber-500" />
                          <h3 className="text-sm font-bold text-slate-900">Quick tips</h3>
                        </div>
                        <ul className="space-y-2">
                          {guide.tips.map((tip, idx) => (
                            <li key={idx} className="text-sm text-slate-600 flex items-start gap-2">
                              <span className="text-slate-300 mt-0.5">•</span>
                              <span>{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
