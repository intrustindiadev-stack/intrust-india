export default function sitemap() {
    const baseUrl = "https://www.intrustindia.com";

    // Static routes
    const routes = [
        "",
        "/login",
        "/signup",
        "/services",
        "/loans/personal",
        "/loans/business",
        "/about",
        "/contact",
        "/legal",
    ].map((route) => ({
        url: `${baseUrl}${route}`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: route === "" ? 1 : 0.8,
    }));

    return [...routes];
}
