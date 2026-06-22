export function validatePricingSettings(settings) {
    const { sub1m, sub6m, sub12m, autoFirst, autoRenewal, merchantReferralPrize } = settings;
    
    const validateSubPrice = (price, name) => {
        if (!Number.isInteger(price)) return `${name} must be a whole number.`;
        if (price <= 0) return `${name} must be greater than 0.`;
        if (price > 100000) return `${name} cannot exceed ₹1,00,000.`;
        return null;
    };

    const err1 = validateSubPrice(sub1m, '1-Month Subscription');
    if (err1) return err1;
    const err2 = validateSubPrice(sub6m, '6-Month Subscription');
    if (err2) return err2;
    const err3 = validateSubPrice(sub12m, '12-Month Subscription');
    if (err3) return err3;
    const err4 = validateSubPrice(autoFirst, 'Auto Mode First Month');
    if (err4) return err4;
    const err5 = validateSubPrice(autoRenewal, 'Auto Mode Renewal');
    if (err5) return err5;

    if (!Number.isInteger(merchantReferralPrize) || merchantReferralPrize < 0 || merchantReferralPrize > 10000) {
        return 'Referral prize must be an integer between 0 and 10000.';
    }

    return null;
}
