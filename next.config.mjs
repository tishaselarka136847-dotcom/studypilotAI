/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Frontend-only: no API routes, server actions, or env vars are used anywhere.
  eslint: { ignoreDuringBuilds: true },
};
export default nextConfig;
