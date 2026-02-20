import { motion } from 'framer-motion';
import Image from 'next/image';

export default function PaymentMethodCard({ method, icon, onClick, disabled, selected }) {
    return (
        <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={!disabled ? onClick : undefined}
            className={`
                relative p-4 rounded-xl border cursor-pointer transition-all
                ${selected
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 hover:border-blue-400 bg-white dark:bg-gray-800 dark:border-gray-700'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
        >
            <div className="flex flex-col items-center gap-3 text-center">
                <div className="w-10 h-10 relative">
                    {/* Placeholder for icon images if not provided */}
                    {icon ? (
                        // If icon is a string URL
                        typeof icon === 'string' ?
                            <Image src={icon} alt={method} fill className="object-contain" />
                            : icon // If it's a component
                    ) : (
                        <div className="w-full h-full bg-gray-200 rounded-full flex items-center justify-center text-xs text-gray-500">
                            {method[0]}
                        </div>
                    )}
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{method}</span>
            </div>

            {selected && (
                <div className="absolute top-2 right-2 w-4 h-4 bg-blue-600 rounded-full border-2 border-white"></div>
            )}
        </motion.div>
    );
}
