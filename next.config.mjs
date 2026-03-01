/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
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
};

export default nextConfig;
