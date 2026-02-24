import { motion } from 'framer-motion';
import Image from 'next/image';

export default function PaymentMethodCard({ method, icon, onClick, disabled, selected }) {
    return (
        <motion.div
            whileHover={{ scale: disabled ? 1 : 1.04, y: disabled ? 0 : -2 }}
            whileTap={{ scale: disabled ? 1 : 0.97 }}
            onClick={!disabled ? onClick : undefined}
            className={`
                group relative p-5 rounded-2xl border-2 cursor-pointer
                transition-all duration-200
                ${selected
                    ? 'border-indigo-500 bg-gradient-to-br from-indigo-50 to-white shadow-lg shadow-indigo-100 ring-2 ring-indigo-200'
                    : 'border-gray-100 bg-white hover:border-indigo-300 hover:shadow-md hover:bg-indigo-50/30'
                }
                ${disabled ? 'opacity-40 cursor-not-allowed !shadow-none' : ''}
            `}
        >
            <div className="flex flex-col items-center gap-3 text-center">
                {/* Icon container */}
                <div className={`
                    w-12 h-12 rounded-xl flex items-center justify-center
                    transition-all duration-200
                    ${selected
                        ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-200'
                        : 'bg-gray-50 text-gray-500 group-hover:bg-indigo-100 group-hover:text-indigo-600'
                    }
                `}>
                    {icon ? (
                        typeof icon === 'string' ?
                            <Image src={icon} alt={method} fill className="object-contain p-2" />
                            : <span className="[&>svg]:!w-5 [&>svg]:!h-5 [&>svg]:!text-current">{icon}</span>
                    ) : (
                        <span className="text-base font-bold">{method[0]}</span>
                    )}
                </div>

                {/* Label */}
                <span className={`text-sm font-semibold transition-colors ${selected ? 'text-indigo-700' : 'text-gray-700'}`}>
                    {method}
                </span>
            </div>

            {/* Selected check badge */}
            {selected && (
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center shadow-md"
                >
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                </motion.div>
            )}
        </motion.div>
    );
}
