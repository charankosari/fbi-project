/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ["localhost"],
    unoptimized: true,
  },
  reactStrictMode: true,
  swcMinify: true,
  // Remove timeout limits for API routes
  experimental: {
    serverActions: {
      bodySizeLimit: "500mb",
    },
  },
  output: 'export',
};

module.exports = nextConfig;
