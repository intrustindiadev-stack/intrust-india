'use client';
import { MotionConfig } from 'framer-motion';

export default function AdminMotionConfig({ children }) {
  return (
    <MotionConfig reducedMotion="user">
      {children}
    </MotionConfig>
  );
}
