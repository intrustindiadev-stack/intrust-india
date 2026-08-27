import React from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import type { CategoryMetadata } from '../../lib/validation/fashion';

interface BreadcrumbsProps {
  ancestors: CategoryMetadata[];
  current: CategoryMetadata;
}

export default function Breadcrumbs({ ancestors, current }: BreadcrumbsProps) {
  const allNodes = [...ancestors, current];

  return (
    <nav aria-label="Breadcrumb" className="py-4 overflow-x-auto no-scrollbar">
      <ol className="flex items-center space-x-2 min-w-max text-sm text-[var(--fashion-color-text-muted)]">
        <li>
          <Link href="/shop/fashion" className="hover:text-[var(--fashion-color-text)] flex items-center transition-colors">
            <Home className="w-4 h-4" />
            <span className="sr-only">Home</span>
          </Link>
        </li>
        {allNodes.map((node, index) => {
          const isLast = index === allNodes.length - 1;
          return (
            <li key={node.id} className="flex items-center">
              <ChevronRight className="w-4 h-4 mx-1" aria-hidden="true" />
              {isLast ? (
                <span className="text-[var(--fashion-color-text)] font-medium" aria-current="page">
                  {node.name}
                </span>
              ) : (
                <Link href={`/shop/fashion/${node.path}`} className="hover:text-[var(--fashion-color-text)] transition-colors">
                  {node.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
