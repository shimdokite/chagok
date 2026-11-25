import type { NextConfig } from "next";

const config: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "10.0.2.2"],
  transpilePackages: ["@chagok/api", "@chagok/contracts"],
  devIndicators: false,

  headers() {
    return [
      {
        source: "/apply",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "frame-src 'none'; object-src 'none'; frame-ancestors 'none'",
          },
        ],
      },
    ];
  },
};
export default config;
