/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', // Allow all external images
      },
    ],
  },
  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,

  // Remove development features in production
  productionBrowserSourceMaps: false,

  // Optimize imports
  modularizeImports: {
    'lucide-react/dist/esm/icons': {
      transform: 'lucide-react/dist/esm/icons/{{kebabCase member}}',
    },
  },
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
