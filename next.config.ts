import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  scope: "/",
  disable: process.env.NODE_ENV === "development" && process.env.ENABLE_PWA_DEV !== "true",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: false,
  reloadOnOnline: true,
  fallbacks: {
    document: "/offline",
  },
  workboxOptions: {
    importScripts: ['/push-handler.js'],
    disableDevLogs: true,
    exclude: [/\.(?:js|css|woff2?)$/, /chunks\//],
    navigateFallbackDenylist: [/^\/cdn-cgi\//],
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/(?:static\.)?cloudflareinsights\.com\//,
        handler: "NetworkOnly",
      },
      {
        urlPattern: /^https:\/\/fonts\.(?:gstatic|googleapis)\.com\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "google-fonts",
          expiration: { maxEntries: 4, maxAgeSeconds: 365 * 24 * 60 * 60 },
        },
      },
      {
        urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "static-image-assets",
          expiration: { maxEntries: 64, maxAgeSeconds: 24 * 60 * 60 },
        },
      },
      {
        urlPattern: /\/api\/(?!auth).*/i,
        handler: "NetworkFirst",
        options: {
          cacheName: "apis",
          networkTimeoutSeconds: 10,
          expiration: { maxEntries: 16, maxAgeSeconds: 24 * 60 * 60 },
        },
      },
    ],
  },
});

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    // Enable TypeScript checks during build
    ignoreBuildErrors: false,
  },
  // Enable Fast Refresh for instant updates without server restart
  reactStrictMode: true,
  // Suppress hydration warnings caused by browser extensions
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  // Image optimization configuration for Docker
  // Disable optimization completely to avoid issues with image serving
  images: {
    unoptimized: true, // Always disable optimization to serve static images directly
    remotePatterns: [],
    // Optimize for mobile devices
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  // Serve static files from uploads directory
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: '/api/static/:path*',
      },
    ];
  },
  // Add public directory for static files
  async headers() {
    const securityHeaders = [
      { key: 'X-DNS-Prefetch-Control', value: 'on' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    ]
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
      {
        source: '/uploads/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/:path*\\.(png|jpg|jpeg|gif|webp|svg|ico|woff|woff2|ttf|eot)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      // Suppress specific warnings in development
      config.infrastructureLogging = {
        level: 'error',
      };
    }
    
    // Optimize bundle splitting for mobile
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Vendor chunk for large libraries
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
              priority: 20,
            },
            // Common chunk for shared code
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 10,
              reuseExistingChunk: true,
              enforce: true,
            },
          },
        },
      };
    }
    
    return config;
  },
  eslint: {
    // Enable ESLint checks during build
    ignoreDuringBuilds: false,
    // Specify which directories to lint
    dirs: ['src', 'app', 'components', 'lib', 'hooks', 'contexts', 'prisma'],
  },
  // Optimize for mobile performance
  experimental: {
    optimizeCss: true, // Optimize CSS for production
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'], // Tree-shake icon libraries
  },
  // Compress output for better mobile performance
  compress: true,
};

export default withPWA(nextConfig);
