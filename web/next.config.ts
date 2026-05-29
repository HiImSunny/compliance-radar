import type { NextConfig } from "next";
import path from "path";
import { config as loadEnv } from "dotenv";

// Load root-level .env so both backend and frontend share one source of truth
loadEnv({ path: path.resolve(__dirname, "../.env"), override: false });

const nextConfig: NextConfig = {
  devIndicators: false,
};

export default nextConfig;
