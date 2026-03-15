/** @type {import('next').NextConfig} */
const nextConfig = {
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

  serverExternalPackages: ['jsonwebtoken'],

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

  // Migration-safe redirects: forward legacy payment routes to modern equivalents.
  // NOTE: /api/payment/callback is intentionally excluded — POST redirects lose
  // the request body, so that handler stays functional with deprecation logging.
  async redirects() {
    return [
      {
        source: '/payment/checkout',
        destination: '/dashboard',
        permanent: true,
      },
      {
        source: '/api/payment/initiate',
        destination: '/api/sabpaisa/initiate',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
