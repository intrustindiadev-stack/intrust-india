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
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },
  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,

  // Remove development features in production
  productionBrowserSourceMaps: false,

  serverExternalPackages: ['jsonwebtoken'],

  async headers() {
    const sabpaisaUrl = process.env.SABPAISA_INIT_URL || process.env.NEXT_PUBLIC_SABPAISA_INIT_URL || 'https://securepay.sabpaisa.in';
    const callbackUrl = process.env.SABPAISA_CALLBACK_URL || '';

    const allowedOrigins = ["'self'"];

    try {
      if (sabpaisaUrl) allowedOrigins.push(new URL(sabpaisaUrl).origin);
      if (callbackUrl) allowedOrigins.push(new URL(callbackUrl).origin);
    } catch (e) {
      // Fallback if URLs are malformed
    }

    // In development or when using ngrok, add a broad https: fallback to prevent blocking
    if (callbackUrl.includes('ngrok-free.dev') || process.env.NODE_ENV !== 'production') {
      allowedOrigins.push("https:");
      allowedOrigins.push("https://*");
    }

    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: `form-action ${allowedOrigins.join(' ')};`
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
