/** @type {import('next').NextConfig} */
const nextConfig = {
    /*
    turbopack: {
      root: process.cwd(),
    },
    */
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**', // Allow all external images
            },
            {
                protocol: 'https',
                hostname: 'bhgbylyzlwmmabegxlfc.supabase.co',
            },
        ],
    },
    // Performance optimizations
    compress: true,
    poweredByHeader: false,
    reactStrictMode: true,

    // Remove development features in production
    productionBrowserSourceMaps: false,

    serverActions: {
        bodySizeLimit: '5mb',
    },

    serverExternalPackages: ['jsonwebtoken'],

    // Optimize imports
    modularizeImports: {
        'lucide-react': {
            transform: 'lucide-react/dist/esm/icons/{{kebabCase member}}',
        },
    },
    async headers() {
        const sabpaisaInitUrl = process.env.SABPAISA_INIT_URL || process.env.NEXT_PUBLIC_SABPAISA_INIT_URL || 'https://securepay.sabpaisa.in';
        let sabpaisaDomain = 'https://securepay.sabpaisa.in';
        try {
            sabpaisaDomain = new URL(sabpaisaInitUrl).origin;
        } catch (e) {
            console.warn('Invalid SABPAISA_INIT_URL, falling back to default live domain for CSP');
        }

        return [
            {
                source: '/:path*',
                headers: [
                    {
                        key: 'Content-Security-Policy',
                        value: `form-action 'self' ${sabpaisaDomain};`
                    },
                ],
            },
        ];
    },
};

export default nextConfig;
