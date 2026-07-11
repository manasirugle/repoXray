import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true
  },
  allowedDevOrigins: ['10.165.121.76', '10.165.121.76:3000', 'localhost:3000']
};

export default nextConfig;
