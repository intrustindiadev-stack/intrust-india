'use client';

import { motion } from 'framer-motion';
import { User, Shield, MapPin, Check } from 'lucide-react';

/**
 * @typedef {Object} StepProgressBarProps
 * @property {1 | 2 | 3} currentStep
 * @property {Set<number>} completedSteps
 */

const steps = [
    { id: 1, label: 'Identity', icon: User },
    { id: 2, label: 'PAN Verify', icon: Shield },
    { id: 3, label: 'Address', icon: MapPin },
];

/** @param {StepProgressBarProps} props */
export default function StepProgressBar({ currentStep, completedSteps }) {
    return (
        <div className="flex items-center justify-between w-full max-w-md mx-auto py-6 px-2">
            {steps.map((step, idx) => {
                const StepIcon = step.icon;
                const isCompleted = completedSteps.has(step.id);
                const isActive = currentStep === step.id;
                const showConnector = idx < steps.length - 1;
                const isConnectorFilled = completedSteps.has(step.id);

                return (
                    <div key={step.id} className="flex items-center flex-1 last:flex-none">
                        {/* Node */}
                        <div className="flex flex-col items-center gap-1.5 relative z-10">
                            {isCompleted ? (
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                                    className="w-10 h-10 rounded-full bg-[#1A56DB] flex items-center justify-center shadow-lg shadow-[#1A56DB]/30"
                                >
                                    <Check size={20} className="text-white" strokeWidth={3} />
                                </motion.div>
                            ) : isActive ? (
                                <motion.div
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="w-10 h-10 rounded-full bg-[#1A56DB] flex items-center justify-center shadow-lg shadow-[#1A56DB]/30 ring-4 ring-[#1A56DB]/15"
                                >
                                    <span className="text-white font-bold text-[15px]">{step.id}</span>
                                </motion.div>
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center">
                                    <span className="text-slate-400 font-bold text-[15px]">{step.id}</span>
                                </div>
                            )}

                            {/* Label */}
                            <span
                                className={`text-[10px] sm:text-xs font-semibold text-center mt-1 transition-colors ${isActive
                                    ? 'text-[#1A56DB]'
                                    : isCompleted
                                        ? 'text-slate-700'
                                        : 'text-slate-400'
                                    }`}
                            >
                                {step.label}
                            </span>
                        </div>

                        {/* Connector */}
                        {showConnector && (
                            <div className="flex-1 h-[2px] border-b-2 border-dashed border-[#CBD5E1] mx-2 relative -mt-5">
                                {isConnectorFilled && (
                                    <motion.div
                                        initial={{ width: '0%' }}
                                        animate={{ width: '100%' }}
                                        transition={{ duration: 0.5, ease: 'easeOut' }}
                                        className="absolute inset-0 bg-[#1A56DB] -mb-[2px] h-[2px] border-b-2 border-solid border-[#1A56DB]"
                                    />
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
