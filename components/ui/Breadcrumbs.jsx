'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Breadcrumbs({ className }) {
    const pathname = usePathname();
    const pathSegments = pathname.split('/').filter(segment => segment !== '');

    if (pathSegments.length === 0) return null;

    return (
        <nav aria-label="Breadcrumb" className={cn("flex items-center space-x-2 text-sm font-medium", className)}>
            <Link
                href="/"
                className="flex items-center text-gray-500 hover:text-gray-900 transition-colors"
            >
                <Home size={16} />
            </Link>

            {pathSegments.map((segment, index) => {
                const href = `/${pathSegments.slice(0, index + 1).join('/')}`;
                const isLast = index === pathSegments.length - 1;
                const label = segment
                    .replace(/-/g, ' ')
                    .replace(/\b\w/g, l => l.toUpperCase());

                return (
                    <div key={href} className="flex items-center space-x-2">
                        <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />
                        {isLast ? (
                            <span className="text-gray-900 font-bold truncate max-w-[150px]">
                                {label}
                            </span>
                        ) : (
                            <Link
                                href={href}
                                className="text-gray-500 hover:text-gray-900 transition-colors truncate max-w-[120px]"
                            >
                                {label}
                            </Link>
                        )}
                    </div>
                );
            })}
        </nav>
    );
}
