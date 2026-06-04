'use client';

import { useState, useRef, useEffect } from 'react';

/**
 * A lightweight windowing/virtualization wrapper for grid items.
 * Mounts the children when close to or in the viewport, and unmounts them
 * when scrolled away to keep DOM node counts low.
 * Retains the observed height of the rendered item as min-height to prevent layout shifting.
 */
export default function VirtualizedGridItem({ children, estimatedHeight = 380 }) {
    const [isVisible, setIsVisible] = useState(false);
    const [height, setHeight] = useState(estimatedHeight);
    const containerRef = useRef(null);

    useEffect(() => {
        const currentRef = containerRef.current;
        if (!currentRef) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                const intersecting = entry.isIntersecting;
                setIsVisible(intersecting);
                if (intersecting && entry.boundingClientRect.height > 0) {
                    setHeight(entry.boundingClientRect.height);
                }
            },
            {
                // rootMargin of 600px allows items to pre-render well before they enter the viewport
                rootMargin: '600px 0px 600px 0px',
                threshold: 0,
            }
        );

        observer.observe(currentRef);

        return () => {
            if (currentRef) {
                observer.unobserve(currentRef);
            }
        };
    }, []);

    return (
        <div
            ref={containerRef}
            style={{
                minHeight: isVisible ? 'auto' : `${height}px`,
            }}
            className="w-full"
        >
            {isVisible ? children : <div style={{ height: `${height}px` }} className="w-full" />}
        </div>
    );
}
