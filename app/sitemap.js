export default function sitemap() {
    const baseUrl = "https://www.intrustindia.com";

    const now = new Date();

    // High priority - core public pages
    const coreRoutes = [
        { url: "", priority: 1.0, changeFrequency: "daily" },
        { url: "/about", priority: 0.9, changeFrequency: "monthly" },
        { url: "/contact", priority: 0.9, changeFrequency: "monthly" },
        { url: "/services", priority: 0.9, changeFrequency: "weekly" },
    ];

    // Product pages
    const productRoutes = [
        { url: "/gift-cards", priority: 0.8, changeFrequency: "weekly" },
        { url: "/nfc-service", priority: 0.8, changeFrequency: "weekly" },
        { url: "/shop", priority: 0.8, changeFrequency: "daily" },
    ];

    // Auth & misc public pages
    const miscRoutes = [
        { url: "/login", priority: 0.5, changeFrequency: "yearly" },
        { url: "/signup", priority: 0.5, changeFrequency: "yearly" },
        { url: "/legal", priority: 0.4, changeFrequency: "yearly" },
    ];

    const allRoutes = [...coreRoutes, ...productRoutes, ...miscRoutes];

    return allRoutes.map(({ url, priority, changeFrequency }) => ({
        url: `${baseUrl}${url}`,
        lastModified: now,
        changeFrequency,
        priority,
    }));
}

