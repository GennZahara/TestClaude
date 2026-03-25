import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Firebase Hosting 정적 배포용
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true, // 정적 export 시 필요
  },
};

export default nextConfig;
