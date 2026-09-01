'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ totalCount, pageSize, currentPage }) {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const totalPages = Math.ceil(totalCount / pageSize);

    if (totalPages <= 1) return null;

    const createPageUrl = (pageNumber) => {
        const params = new URLSearchParams(searchParams);
        params.set('page', pageNumber.toString());
        return `${pathname}?${params.toString()}`;
    };

    return (
        <div className="flex items-center justify-between border-t border-gray-200 dark:border-white/10 bg-white dark:bg-[#0c0e16] px-4 py-3 sm:px-6 rounded-2xl shadow-sm mt-8">
            <div className="flex flex-1 justify-between sm:hidden">
                <Link
                    href={currentPage > 1 ? createPageUrl(currentPage - 1) : '#'}
                    className={`relative inline-flex items-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#151822] px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 ${
                        currentPage <= 1 ? 'opacity-50 pointer-events-none' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                >
                    Previous
                </Link>
                <Link
                    href={currentPage < totalPages ? createPageUrl(currentPage + 1) : '#'}
                    className={`relative ml-3 inline-flex items-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#151822] px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 ${
                        currentPage >= totalPages ? 'opacity-50 pointer-events-none' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                >
                    Next
                </Link>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm text-gray-700 dark:text-gray-400">
                        Showing <span className="font-bold text-gray-900 dark:text-white">{((currentPage - 1) * pageSize) + 1}</span> to{' '}
                        <span className="font-bold text-gray-900 dark:text-white">{Math.min(currentPage * pageSize, totalCount)}</span> of{' '}
                        <span className="font-bold text-gray-900 dark:text-white">{totalCount}</span> results
                    </p>
                </div>
                <div>
                    <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                        <Link
                            href={currentPage > 1 ? createPageUrl(currentPage - 1) : '#'}
                            className={`relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 dark:text-gray-500 ring-1 ring-inset ring-gray-300 dark:ring-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 focus:z-20 focus:outline-offset-0 ${
                                currentPage <= 1 ? 'opacity-50 pointer-events-none' : ''
                            }`}
                        >
                            <span className="sr-only">Previous</span>
                            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                        </Link>
                        
                        {/* Page Numbers */}
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                            // Show first, last, current, and adjacent pages
                            if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                                const isCurrent = page === currentPage;
                                return (
                                    <Link
                                        key={page}
                                        href={createPageUrl(page)}
                                        aria-current={isCurrent ? 'page' : undefined}
                                        className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ring-1 ring-inset ${
                                            isCurrent
                                                ? 'z-10 bg-indigo-600 text-white focus-visible:outline-indigo-600 ring-indigo-600'
                                                : 'text-gray-900 dark:text-gray-300 ring-gray-300 dark:ring-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                                        }`}
                                    >
                                        {page}
                                    </Link>
                                );
                            }
                            
                            // Show ellipsis
                            if (page === currentPage - 2 || page === currentPage + 2) {
                                return (
                                    <span
                                        key={page}
                                        className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-400 ring-1 ring-inset ring-gray-300 dark:ring-gray-700 focus:outline-offset-0"
                                    >
                                        ...
                                    </span>
                                );
                            }
                            
                            return null;
                        })}

                        <Link
                            href={currentPage < totalPages ? createPageUrl(currentPage + 1) : '#'}
                            className={`relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 dark:text-gray-500 ring-1 ring-inset ring-gray-300 dark:ring-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 focus:z-20 focus:outline-offset-0 ${
                                currentPage >= totalPages ? 'opacity-50 pointer-events-none' : ''
                            }`}
                        >
                            <span className="sr-only">Next</span>
                            <ChevronRight className="h-5 w-5" aria-hidden="true" />
                        </Link>
                    </nav>
                </div>
            </div>
        </div>
    );
}
