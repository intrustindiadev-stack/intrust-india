export default function robots() {
    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: [
                    '/admin',
                    '/admin/',
                    '/merchant/dashboard',
                    '/merchant/',
                    '/debug-auth',
                    '/test-admin',
                    '/api/',
                    '/auth/',
                ],
            },
        ],
        sitemap: 'https://www.intrustindia.com/sitemap.xml',
        host: 'https://www.intrustindia.com',
    };
}
