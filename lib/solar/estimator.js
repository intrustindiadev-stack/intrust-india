export const BILL_RANGES = [
    { id: 'less_1500', label: '< ₹1,500', sub: 'Basic', kw: '1–2 kW', avgSaving: 1200 },
    { id: '1500_2500', label: '₹1,500–2,500', sub: 'Standard', kw: '2–3 kW', avgSaving: 2000 },
    { id: '2500_4000', label: '₹2,500–4,000', sub: 'Medium', kw: '3–5 kW', avgSaving: 3200 },
    { id: '4000_8000', label: '₹4,000–8,000', sub: 'Large', kw: '5–8 kW', avgSaving: 6000 },
    { id: 'more_8000', label: '> ₹8,000', sub: 'Commercial', kw: '8+ kW', avgSaving: 10000 },
];

export const PROPERTY_TYPES = [
    { id: 'residential', label: 'Home' },
    { id: 'commercial', label: 'Shop / Office' },
    { id: 'industrial', label: 'Factory' },
];

export function estimateSavings(billRangeId) {
    const range = BILL_RANGES.find(r => r.id === billRangeId);
    if (!range) return null;
    
    return {
        kwSuggestion: range.kw,
        estimatedMonthlySavings: range.avgSaving,
        estimatedAnnualSavings: range.avgSaving * 12,
        paybackPeriodYears: '3-4'
    };
}
