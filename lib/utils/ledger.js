export function calculatePlatformFeePercentage(commissionRate, feeAmount, baseAmount) {
    if (typeof commissionRate === 'number') {
        const rate = commissionRate <= 1 ? Math.round(commissionRate * 100) : Math.round(commissionRate);
        if (rate >= 0 && rate <= 100) return rate;
    }

    if (typeof feeAmount === 'number' && typeof baseAmount === 'number' && baseAmount > 0) {
        const percentage = Math.round((feeAmount / baseAmount) * 100);
        if (percentage >= 0 && percentage <= 100) return percentage;
    }

    return null;
}
