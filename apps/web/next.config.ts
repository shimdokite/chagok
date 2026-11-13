import type { NextConfig } from "next";
const config: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  transpilePackages: ["@chagok/api", "@chagok/contracts"],
  devIndicators: false,
};
export default config;
