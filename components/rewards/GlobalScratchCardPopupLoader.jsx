'use client';

import dynamic from 'next/dynamic';

const GlobalScratchCardPopup = dynamic(
    () => import('@/components/rewards/GlobalScratchCardPopup'),
    { ssr: false }
);

export default function GlobalScratchCardPopupLoader() {
    return <GlobalScratchCardPopup />;
}
