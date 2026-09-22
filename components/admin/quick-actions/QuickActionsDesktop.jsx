import Link from 'next/link';
import { getQuickActions } from './quickActionsData';

export default function QuickActionsDesktop({ shoppingStats, className = '' }) {
    const actions = getQuickActions(shoppingStats);

    return (
        <div className={`hidden md:block ${className}`}>
            <div className="bg-white rounded-3xl border border-gray-100 p-4 md:p-6 shadow-sm lg:sticky lg:top-28 transition-all">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Quick Actions
                    </h2>
                    <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        Shortcuts
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-1 gap-4">
                    {actions.map((action) => {
                        const Icon = action.icon;
                        return (
                            <Link
                                key={action.id}
                                href={action.href}
                                className={`group flex items-start gap-4 p-4 rounded-2xl ${action.hoverBg} border border-transparent ${action.hoverBorder} transition-all duration-200 hover:shadow-sm`}
                            >
                                <div
                                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center text-white text-xl shadow-lg ${action.shadow} group-hover:scale-110 transition-transform shrink-0 relative`}
                                >
                                    {action.emoji || <Icon className="w-6 h-6" />}
                                    {action.badge !== null && action.badge !== undefined && (
                                        <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full ring-2 ring-white">
                                            {action.badge}
                                        </span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className={`font-bold text-slate-900 ${action.hoverText} transition-colors truncate`}>
                                        {action.title}
                                    </h3>
                                    <p className="text-sm text-slate-500 mt-0.5 leading-snug line-clamp-2">
                                        {action.description}
                                    </p>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
