'use client';
import { useState } from 'react';
import PageGuideTrigger from './PageGuideTrigger';
import PageGuideDrawer from './PageGuideDrawer';
import { PAGE_GUIDES } from '@/lib/admin-page-guides';

export default function PageGuideWrapper({ pageKey }) {
  const guide = PAGE_GUIDES[pageKey];
  const [guideOpen, setGuideOpen] = useState(false);
  
  if (!guide) return null;

  return (
    <>
      <PageGuideTrigger guide={guide} onOpen={() => setGuideOpen(true)} />
      <PageGuideDrawer guide={guide} open={guideOpen} onOpenChange={setGuideOpen} />
    </>
  );
}
