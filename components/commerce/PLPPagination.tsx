'use client';

import React from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Pagination from '@/components/search/Pagination';

interface PLPPaginationProps {
  page: number;
  totalCount: number;
  pageSize?: number;
}

export default function PLPPagination({ page, totalCount, pageSize = 24 }: PLPPaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const totalPages = Math.ceil(totalCount / pageSize);
  if (totalPages <= 1) return null;

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams ? searchParams.toString() : '');
    if (newPage > 1) {
      params.set('page', newPage.toString());
    } else {
      params.delete('page');
    }
    const queryString = params.toString();
    router.push(pathname + (queryString ? `?${queryString}` : ''));
  };

  return (
    <div className="mt-12 flex justify-center">
      <Pagination
        page={page}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={pageSize}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
