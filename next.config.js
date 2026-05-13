/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Disable to prevent double-render in dev
  poweredByHeader: false,
  compress: true,
  
  // Performance optimizations
  swcMinify: true,
  
  compiler: {
    // Remove console in production only
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Webpack configuration to fix module resolution issues
  webpack: (config, { isServer, dev }) => {
    // Fix for "Cannot read properties of undefined (reading 'call')" error
    config.optimization = {
      ...config.optimization,
      moduleIds: 'deterministic',
    };

    // Improve module resolution
    config.resolve = {
      ...config.resolve,
      fallback: {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      },
    };

    // Better error handling in development
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
        ignored: ['**/node_modules', '**/.next'],
      };
    }

    return config;
  },
  
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns'],
    scrollRestoration: false,
  },
  
  // Disable all logging including Next.js internal warnings
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
  
  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
  },
  
  // Headers for performance
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, must-revalidate',
          },
        ],
      },
    ];
  },
  
  // Redirects for common issues
  async redirects() {
    return [
      {
        source: '/sw.js',
        destination: '/404',
        permanent: false,
      },
    ];
  },
}

module.exports = nextConfig
