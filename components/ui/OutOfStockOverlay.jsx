'use client';

import OutOfStockBadge from './OutOfStockBadge';

const OutOfStockOverlay = ({ className = '' }) => {
    return (
        <div className={`absolute inset-0 bg-black/45 flex items-center justify-center z-10 pointer-events-none rounded-[inherit] ${className}`}>
            <OutOfStockBadge size="md" variant="solid" />
        </div>
    );
};

export default OutOfStockOverlay;
