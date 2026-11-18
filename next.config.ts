import path from 'node:path'
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone',
  experimental: {
    agentFeedback: true,
    agentUpgrade: "security",
  },
  reactCompiler: true,
  allowedDevOrigins: ['127.0.0.1'],
  turbopack: {
    root: path.resolve(__dirname),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
