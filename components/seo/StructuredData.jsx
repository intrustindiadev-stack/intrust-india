import Script from 'next/script';

export default function StructuredData() {
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": ["Store", "Organization"],
        "name": "INTRUST",
        "alternateName": "INTRUST | Premium Gift Cards & NFC",
        "url": "https://www.intrustindia.com",
        "logo": "https://www.intrustindia.com/icon.png",
        "image": "https://www.intrustindia.com/icon.png",
        "description": "Premium Gift Cards, innovative NFC solutions, and smart e-commerce platform.",
        "foundingDate": "2014",
        "address": {
            "@type": "PostalAddress",
            "streetAddress": "TF-312/MM09, Ashima Mall, Narmadapuram Rd, Danish Nagar",
            "addressLocality": "Bhopal",
            "addressRegion": "Madhya Pradesh",
            "postalCode": "462026",
            "addressCountry": "IN"
        },
        "contactPoint": {
            "@type": "ContactPoint",
            "telephone": "+91-1800-203-0052",
            "contactType": "customer service",
            "email": "info@intrustfinancialindia.com",
            "availableLanguage": ["English", "Hindi"]
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
