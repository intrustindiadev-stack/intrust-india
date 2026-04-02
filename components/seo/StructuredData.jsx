import Script from 'next/script';

const BASE_URL = 'https://www.intrustindia.com';

// Organization + LocalBusiness schema
const organizationSchema = {
    "@context": "https://schema.org",
    "@type": ["Organization", "LocalBusiness"],
    "@id": `${BASE_URL}/#organization`,
    "name": "InTrust India",
    "alternateName": ["InTrust"],
    "url": BASE_URL,
    "logo": {
        "@type": "ImageObject",
        "url": `${BASE_URL}/icon.png`,
        "width": 512,
        "height": 512
    },
    "image": `${BASE_URL}/og-image.png`,
    "description": "InTrust India provides gift cards, NFC smart cards, bill payments, and a curated e-commerce experience for customers across India.",
    "foundingDate": "2014",
    "address": {
        "@type": "PostalAddress",
        "streetAddress": "TF-312/MM09, Ashima Mall, Narmadapuram Rd, Danish Nagar",
        "addressLocality": "Bhopal",
        "addressRegion": "Madhya Pradesh",
        "postalCode": "462026",
        "addressCountry": "IN"
    },
    "geo": {
        "@type": "GeoCoordinates",
        "latitude": "23.2599",
        "longitude": "77.4126"
    },
    "contactPoint": [
        {
            "@type": "ContactPoint",
            "telephone": "+91-1800-203-0052",
            "contactType": "customer service",
            "email": "info@intrustindia.com",
            "availableLanguage": ["English", "Hindi"],
            "contactOption": "TollFree",
            "areaServed": "IN"
        }
    ],
    "areaServed": {
        "@type": "Country",
        "name": "India"
    },
    "priceRange": "₹₹",
    "openingHoursSpecification": {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        "opens": "09:00",
        "closes": "18:00"
    },
    "sameAs": [
        "https://www.facebook.com/intrustindia",
        "https://www.instagram.com/intrustindia",
        "https://www.linkedin.com/company/intrustindia",
        "https://www.justdial.com/Bhopal/Intrust-Financial-Services-India-Pvt-Ltd"
    ],
    "hasOfferCatalog": {
        "@type": "OfferCatalog",
        "name": "Products & Services",
        "itemListElement": [
            { "@type": "Offer", "itemOffered": { "@type": "Product", "name": "Gift Cards" } },
            { "@type": "Offer", "itemOffered": { "@type": "Product", "name": "NFC Smart Card" } },
            { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Bill Payment" } }
        ]
    }
};

// WebSite schema with Sitelinks Searchbox
const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${BASE_URL}/#website`,
    "url": BASE_URL,
    "name": "InTrust India",
    "description": "Gift Cards, NFC Smart Cards & E-commerce",
    "publisher": { "@id": `${BASE_URL}/#organization` },
    "potentialAction": {
        "@type": "SearchAction",
        "target": {
            "@type": "EntryPoint",
            "urlTemplate": `${BASE_URL}/services?q={search_term_string}`
        },
        "query-input": "required name=search_term_string"
    }
};

// FAQ Schema for common queries
const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
        {
            "@type": "Question",
            "name": "What types of services does InTrust India offer?",
            "acceptedAnswer": {
                "@type": "Answer",
                "text": "InTrust offers NFC smart cards, digital gift cards, bill payments, and premium e-commerce services across India."
            }
        },
        {
            "@type": "Question",
            "name": "Can I buy gift cards on InTrust?",
            "acceptedAnswer": {
                "@type": "Answer",
                "text": "Yes, InTrust offers a wide range of digital gift cards that can be purchased and gifted instantly to anyone across India."
            }
        },
        {
            "@type": "Question",
            "name": "Where is InTrust India located?",
            "acceptedAnswer": {
                "@type": "Answer",
                "text": "InTrust India is headquartered at TF-312, Ashima Mall, Narmadapuram Road, Danish Nagar, Bhopal, Madhya Pradesh 462026. We serve customers across all of India."
            }
        }
    ]
};

export default function StructuredData() {
    return (
        <>
            <Script
                id="structured-data-org"
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
            />
            <Script
                id="structured-data-website"
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
            />
            <Script
                id="structured-data-faq"
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
            />
        </>
    );
}

