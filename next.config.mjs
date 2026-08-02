// dev-tools/ is intentionally outside the Next.js build tree (not under app/, pages/, components/, lib/, or public/)
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Serve AVIF/WebP automatically — Android Chrome supports both; ~40-60% smaller
    formats: ['image/avif', 'image/webp'],
    // Include common Android viewport widths (360, 390, 414) for optimal srcset
    deviceSizes: [360, 390, 414, 640, 750, 828, 1080, 1200, 1920],
    // Cache immutable Supabase CDN images for 1 year in the browser
    minimumCacheTTL: 31536000,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', // Allow all external images
      },
      {
        protocol: 'https',
        hostname: 'intrustindia.com',
      },
      {
        protocol: 'https',
        hostname: 'supabase.intrustindia.com', // future CDN subdomain
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
    const callbackUrl = process.env.SABPAISA_CALLBACK_URL || '';

    // form-action 'self' https: — allows form submissions to any HTTPS endpoint.
    // Payment security is enforced server-side (encrypted payload, canonical amount
    // derivation, callback signature verification). Chrome's CSP form-action matching
    // with specific origin+path combinations has known quirks, so we use https: here.
    const allowedOrigins = ["'self'", 'https:'];

    // In development or when using ngrok, also allow http: for local testing
    if (callbackUrl.includes('ngrok-free.dev') || process.env.NODE_ENV !== 'production') {
      allowedOrigins.push('http:');
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

export default (phase) => {
  if (process.env.NODE_ENV === 'production' && phase === 'phase-production-server') {
    if (!process.env.OTP_PEPPER) {
      throw new Error(
        '\n\n========================================================================\n' +
        'CRITICAL: OTP_PEPPER environment variable is not set in production.\n' +
        'Refusing to start the server to avoid insecure legacy or failing OTPs.\n' +
        '========================================================================\n'
      );
    }
  }
  return nextConfig;
};
