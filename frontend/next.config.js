/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    formats: ['image/webp'],
  },
  async redirects() {
    return [
      // Common alias — /signin → /login
      { source: '/signin', destination: '/login', permanent: true },
    ];
  },
};

module.exports = nextConfig;
