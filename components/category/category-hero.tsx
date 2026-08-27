import React from 'react';
import Image from 'next/image';
import Breadcrumbs from './breadcrumbs';
import type { CategoryMetadata } from '../../lib/validation/fashion';

interface CategoryHeroProps {
  category: CategoryMetadata;
  ancestors: CategoryMetadata[];
  childrenCategories: CategoryMetadata[];
}

export default function CategoryHero({ category, ancestors, childrenCategories }: CategoryHeroProps) {
  return (
    <div className="w-full">
      <div className="max-w-[var(--fashion-container-max)] mx-auto px-4 sm:px-6 lg:px-8">
        <Breadcrumbs ancestors={ancestors} current={category} />
      </div>

      <div className="relative w-full h-[250px] md:h-[350px] lg:h-[400px] overflow-hidden bg-[var(--fashion-color-surface-muted)]">
        {category.banner_url && (
          <Image
            src={category.banner_url}
            alt={category.banner_alt || category.title}
            fill
            className="object-cover"
            priority
          />
        )}
        <div className="absolute inset-0 bg-black/40 flex flex-col justify-center items-center text-center px-4">
          <h1 className="text-3xl md:text-5xl font-display font-bold text-white mb-4">
            {category.title}
          </h1>
          {category.description && (
            <p className="text-white/90 max-w-2xl text-lg">
              {category.description}
            </p>
          )}
        </div>
      </div>

      {childrenCategories.length > 0 && (
        <div className="max-w-[var(--fashion-container-max)] mx-auto px-4 sm:px-6 lg:px-8 mt-8">
          <div className="flex overflow-x-auto no-scrollbar space-x-4 pb-4">
            {childrenCategories.map(child => (
              <a
                key={child.id}
                href={`/shop/fashion/${child.path}`}
                className="flex-shrink-0 px-6 py-3 rounded-[var(--fashion-radius-pill)] border border-[var(--fashion-color-border)] hover:border-[var(--fashion-color-accent)] font-medium text-[var(--fashion-color-text)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--fashion-color-accent)]"
              >
                {child.name}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
