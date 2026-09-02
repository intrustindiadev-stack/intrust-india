'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, ChevronRight } from 'lucide-react';
import MobileDrawer from '@/components/dashboard/MobileDrawer';

export interface TopBarProps {
  user?: {
    full_name?: string | null;
    avatar_url?: string | null;
    email?: string | null;
  } | null;
}

function getInitials(name?: string | null, email?: string | null): string {
  if (name && name.trim().length > 0) {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  if (email && email.trim().length > 0) {
    return email.slice(0, 2).toUpperCase();
  }
  return 'U';
}

export default function TopBar({ user }: TopBarProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const pathname = usePathname();

  // Compute dynamic breadcrumb trail
  const segments = (pathname || '/dashboard')
    .split('/')
    .filter(Boolean);

  const initials = getInitials(user?.full_name, user?.email);

  return (
    <>
      <header className="bg-white border-b border-gray-200 shadow-sm h-16 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
        {/* Left Section */}
        <div className="flex items-center gap-3">
          {/* Mobile Hamburger Button */}
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="lg:hidden p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" aria-hidden="true" />
          </button>

          {/* Desktop Breadcrumbs */}
          <nav aria-label="Breadcrumbs" className="hidden lg:flex items-center gap-1.5 text-sm text-gray-500">
            <Link href="/" className="hover:text-gray-900 transition-colors">
              Home
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" aria-hidden="true" />
            <Link href="/dashboard" className="hover:text-gray-900 transition-colors">
              Dashboard
            </Link>
            {segments.length > 1 && segments.slice(1).map((seg, idx) => {
              const href = `/${segments.slice(0, idx + 2).join('/')}`;
              const formattedSeg = seg.charAt(0).toUpperCase() + seg.slice(1);
              const isLast = idx === segments.length - 2;

              return (
                <React.Fragment key={href}>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-400" aria-hidden="true" />
                  {isLast ? (
                    <span className="font-medium text-gray-900" aria-current="location">
                      {formattedSeg}
                    </span>
                  ) : (
                    <Link href={href} className="hover:text-gray-900 transition-colors">
                      {formattedSeg}
                    </Link>
                  )}
                </React.Fragment>
              );
            })}
          </nav>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-3">
          {user?.full_name && (
            <span className="text-sm font-medium text-gray-700 hidden md:inline">
              {user.full_name}
            </span>
          )}

          {user?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatar_url}
              alt={user.full_name ? `${user.full_name}'s avatar` : 'User avatar'}
              className="w-8 h-8 rounded-full object-cover border border-gray-200"
            />
          ) : (
            <div
              className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold select-none"
              aria-hidden="true"
            >
              {initials}
            </div>
          )}
        </div>
      </header>

      {/* Mobile Drawer */}
      <MobileDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
    </>
  );
}
