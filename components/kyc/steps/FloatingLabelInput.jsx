'use client';

import { motion } from 'framer-motion';
import { Lock, Pencil, Check, AlertCircle } from 'lucide-react';

/**
 * Dark-themed floating label input for the KYC wizard.
 *
 * @typedef {Object} FloatingLabelInputProps
 * @property {string} label
 * @property {string} [value]
 * @property {string | null} [error]
 * @property {boolean} [success]
 * @property {boolean} [locked]
 * @property {() => void} [onEditClick]
 * @property {boolean} [isTextarea]
 * @property {number} [rows]
 * @property {React.ReactNode} [leftElement]
 */

/** @param {FloatingLabelInputProps & React.InputHTMLAttributes<HTMLInputElement>} props */
export default function FloatingLabelInput({
    label,
    value = '',
    error = null,
    success = false,
    locked = false,
    onEditClick,
    isTextarea = false,
    rows = 3,
    leftElement,
    className = '',
    inputClassName = '',
    labelClassName = '',
    ...rest
}) {
    const hasValue = (value !== undefined && value !== '') || rest.type === 'date';

    const borderClass = error
        ? 'border-red-500 focus-within:border-red-500 focus-within:ring-4 focus-within:ring-red-500/10'
        : success
            ? 'border-green-500 focus-within:ring-4 focus-within:ring-green-500/10'
            : 'border-[#E2E8F0] focus-within:border-[#1A56DB] focus-within:ring-4 focus-within:ring-[#1A56DB]/10';

    const InputTag = isTextarea ? 'textarea' : 'input';

    return (
        <div className={`w-full ${className}`}>
            <div
                className={`relative group bg-white rounded-2xl border-[1.5px] flex items-center ${borderClass} transition-all duration-200 ${error ? 'animate-shake' : ''
                    }`}
            >
                {leftElement && (
                    <div className="pl-3 flex-none flex items-center z-10">
                        {leftElement}
                    </div>
                )}
                <InputTag
                    className={`w-full px-4 pt-[18px] pb-[6px] bg-transparent text-[15px] font-semibold outline-none placeholder:text-transparent peer min-h-[52px]
                        ${locked ? 'cursor-default' : ''} ${isTextarea ? 'resize-none' : ''}
                        ${rest.type === 'date' ? '[&::-webkit-calendar-picker-indicator]:opacity-50 [&::-webkit-calendar-picker-indicator]:hover:opacity-100 [&::-webkit-calendar-picker-indicator]:cursor-pointer' : ''}
                        text-slate-900 ${inputClassName}`}
                    placeholder={label}
                    value={value}
                    readOnly={locked}
                    rows={isTextarea ? rows : undefined}
                    {...rest}
                />

                {/* Floating label */}
                <label
                    className={`absolute transition-all duration-200 pointer-events-none font-medium
            ${hasValue
                            ? 'top-1.5 text-[10px] left-4 z-10'
                            : `top-1/2 -translate-y-1/2 text-sm ${labelClassName || 'left-4'}`
                        }
                        }
            ${error
                            ? 'text-red-500'
                            : success
                                ? 'text-green-600'
                                : 'text-slate-500 peer-focus:text-[#1A56DB]'
                        }
            peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:translate-y-0 peer-focus:left-4 peer-focus:z-10
            peer-[:not(:placeholder-shown)]:top-1.5 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:left-4 peer-[:not(:placeholder-shown)]:z-10
            peer-[&:-webkit-autofill]:top-1.5 peer-[&:-webkit-autofill]:text-[10px] peer-[&:-webkit-autofill]:translate-y-0 peer-[&:-webkit-autofill]:left-4 peer-[&:-webkit-autofill]:z-10
            `}
                >
                    {label}
                </label>

                {/* Lock / Edit icons */}
                {locked && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        <Lock size={14} className="text-slate-500" />
                        {onEditClick && (
                            <button
                                type="button"
                                onClick={onEditClick}
                                className="p-1 hover:bg-slate-100 rounded-md transition-colors"
                                aria-label={`Edit ${label}`}
                            >
                                <Pencil size={14} className="text-blue-600" />
                            </button>
                        )}
                    </div>
                )}

                {/* Success checkmark */}
                {success && !locked && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                        >
                            <Check size={18} className="text-green-500" strokeWidth={3} />
                        </motion.div>
                    </div>
                )}
            </div>

            {/* Error message */}
            {error && (
                <p className="text-red-400 text-xs mt-1.5 ml-1 flex items-center gap-1">
                    <AlertCircle size={10} /> {error}
                </p>
            )}
        </div>
    );
}
