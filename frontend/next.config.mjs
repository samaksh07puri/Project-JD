/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The services deployment serves this app statically, so Next's on-demand
  // image optimizer (/_next/image) is not available and would 404. Serve the
  // bundled images directly instead.
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
