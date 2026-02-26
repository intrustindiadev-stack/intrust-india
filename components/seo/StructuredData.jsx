import Script from 'next/script';

export default function StructuredData() {
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "FinancialService",
        "name": "InTrust India",
        "url": "https://www.intrustindia.com",
        "logo": "https://www.intrustindia.com/icons/intrustLogo.png",
        "image": "https://www.intrustindia.com/og-image.png",
        "description": "Premium financial service provider in India offering instant personal loans, business loans, and gold loans.",
        "address": {
            "@type": "PostalAddress",
            "addressLocality": "Bhopal",
            "addressRegion": "Madhya Pradesh",
            "addressCountry": "IN"
        },
        "geo": {
            "@type": "GeoCoordinates",
            "latitude": "23.2599",
            "longitude": "77.4126"
        },
        "areaServed": {
            "@type": "Country",
            "name": "India"
        },
        "sameAs": [
            "https://www.facebook.com/intrustindia",
            "https://www.twitter.com/intrustindia",
            "https://www.instagram.com/intrustindia",
            "https://www.linkedin.com/company/intrustindia"
        ],
        "priceRange": "$$",
        "openingHoursSpecification": {
            "@type": "OpeningHoursSpecification",
            "dayOfWeek": [
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday"
            ],
            "opens": "09:00",
            "closes": "18:00"
        }
    };

    return (
        <Script
            id="structured-data"
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
    );
}
