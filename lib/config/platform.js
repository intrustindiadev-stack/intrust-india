/**
 * Static configuration with environment variable fallbacks.
 * This remains as the primary source for values that don't need UI-driven updates,
 * or as a fallback for the database.
 */
export const PLATFORM_CONFIG = {
    business: {
        name: process.env.PLATFORM_BUSINESS_NAME || "Intrust Financial Services (India) Pvt. Ltd.",
        address: process.env.PLATFORM_BUSINESS_ADDRESS || "TF-312/MM09, Ashima Mall, Narmadapuram Rd, Danish Naga, Bhopal, MP 462026",
        phone: process.env.PLATFORM_PHONE || "18002030052",
        gstin: process.env.PLATFORM_GSTIN || "23AAFC14866A1ZV",
        pan: process.env.PLATFORM_PAN || "AAFC14866A",
        website: process.env.PLATFORM_WEBSITE || "www.intrustindia.com",
        email: process.env.PLATFORM_EMAIL || "info@intrustindia.com"
    }
};

/**
 * Validates that all critical platform details are present.
 * @returns {boolean}
 */
export const validatePlatformConfig = (config = PLATFORM_CONFIG) => {
    const { name, gstin, pan } = config.business;
    return !!(name && gstin && pan);
};
