'use client';

import { useSyncExternalStore } from 'react';

// ── SSR-safe window dimensions without setState-in-effect ────────────────────
function subscribe(onChange) {
    window.addEventListener('resize', onChange);
    return () => window.removeEventListener('resize', onChange);
}

function getSnapshot() {
    return `${window.innerWidth}x${window.innerHeight}`;
}

function getServerSnapshot() {
    return '0x0';
}

export function useWindowDimension() {
    const dim = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
    const [w, h] = dim.split('x');
    return { width: Number(w) || 0, height: Number(h) || 0 };
}
