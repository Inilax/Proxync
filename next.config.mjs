/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async redirects() {
    return [
      {
        source: "/changelog",
        destination: "/docs/changelog",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
