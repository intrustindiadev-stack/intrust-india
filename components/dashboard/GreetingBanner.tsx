import React from 'react';

export interface GreetingBannerProps {
  userName?: string | null;
}

export default function GreetingBanner({ userName }: GreetingBannerProps) {
  const currentHour = new Date().getHours();
  let greetingTime = 'morning';
  if (currentHour >= 12 && currentHour < 17) {
    greetingTime = 'afternoon';
  } else if (currentHour >= 17 || currentHour < 5) {
    greetingTime = 'evening';
  }

  const rawName = (userName || '').trim();
  const firstName = rawName.split(' ')[0] || 'there';

  return (
    <div className="relative overflow-hidden bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex items-center justify-between">
      <div className="relative z-10">
        <h1 className="text-2xl font-semibold text-gray-900">
          Good {greetingTime}, {firstName}!
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Here&apos;s what&apos;s happening with your account today.
        </p>
      </div>

      {/* Decorative subtle gradient pattern */}
      <div
        className="hidden sm:block absolute right-0 top-0 bottom-0 w-48 bg-gradient-to-l from-blue-50/70 to-transparent pointer-events-none"
        aria-hidden="true"
      >
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-blue-100/40 blur-2xl" />
        <div className="absolute right-8 bottom-0 w-24 h-24 rounded-full bg-indigo-100/40 blur-xl" />
      </div>
    </div>
  );
}
