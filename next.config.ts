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
  // ✅ NEW: proxy ONLY migrated auth routes to .NET backend
  async rewrites() {
    const backend = process.env.BACKEND_URL || 'http://localhost:5000';
    return [
      // ✅ Only the 4 migrated auth routes → .NET
      // (NextAuth routes like /api/auth/session and /api/auth/[...nextauth]
      //  are NOT proxied and continue to be handled by Next.js)
      {
        source: '/api/auth/register',
        destination: `${backend}/api/auth/register`,
      },
      {
        source: '/api/auth/staff-login',
        destination: `${backend}/api/auth/staff-login`,
      },
      {
        source: '/api/auth/verify-email',
        destination: `${backend}/api/auth/verify-email`,
      },
      {
        source: '/api/auth/resend-verification',
        destination: `${backend}/api/auth/resend-verification`,
      },

      // Existing — uploads
      {
        source: '/uploads/:path*',
        destination: '/api/static/:path*',
      },

      // 🔮 Future modules (uncomment jab migrate karo):
      // { source: '/api/leads/:path*',        destination: `${backend}/api/leads/:path*` },
      // { source: '/api/clients/:path*',      destination: `${backend}/api/clients/:path*` },
      // { source: '/api/applications/:path*', destination: `${backend}/api/applications/:path*` },
      // { source: '/api/support/:path*',      destination: `${backend}/api/support/:path*` },
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
      // Node core modules used by server-only code (e.g. src/lib/database-provider.ts's
      // custom-database-config persistence) get pulled into the client dependency graph
      // transitively through shared modules like src/lib/db.ts. They're never actually
      // called in the browser, so stub them out instead of failing the client build.
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      }
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
    optimizeCss: false,
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'], // Tree-shake icon libraries
  },
  // Compress output for better mobile performance
  compress: true,
};

export default withPWA(nextConfig);