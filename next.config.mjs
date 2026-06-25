/** @type {import('next').NextConfig} */
const nextConfig = {
  // Статический экспорт для деплоя на GitHub Pages
  output: "export",
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
};

export default nextConfig;
