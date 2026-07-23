import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  // ... PWA config (same as before)
});

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    // Enable TypeScript checks during build
    ignoreBuildErrors: false,
  },
  // Enable Fast Refresh for instant updates without server restart
  reactStrictMode: true,
  // ... other config options
  eslint: {
    // Enable ESLint checks during build
    ignoreDuringBuilds: false,
    // Optional: specify directories to lint
    dirs: ['src', 'app', 'components', 'lib', 'hooks'],
  },
  // ... rest of the config
};

export default withPWA(nextConfig);