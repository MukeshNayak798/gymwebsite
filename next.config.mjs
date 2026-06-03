/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['sqlite3'],
  },
};

export default nextConfig;
