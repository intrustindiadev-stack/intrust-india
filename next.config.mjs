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
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "form-action 'self' https://stage-securepay.sabpaisa.in https://secure.sabpaisa.in https://uat.sabpaisa.in https://securepay.sabpaisa.in;"
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
