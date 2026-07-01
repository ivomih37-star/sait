/** @type {import('next').NextConfig} */
const nextConfig = {
  // Серверный рантайм для API Routes, TMA-валидации и Prisma.
  // standalone — компактная сборка для Docker / PM2 на Beget VPS.
  output: "standalone",
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "prisma"],
  },
};

export default nextConfig;
