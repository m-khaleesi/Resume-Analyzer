import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    config.resolve.alias["unpdf/pdfjs"] = false;
    return config;
  },
};

export default nextConfig;