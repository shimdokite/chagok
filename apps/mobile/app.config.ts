import type { ExpoConfig } from "expo/config";
const config: ExpoConfig = {
  name: "차곡",
  slug: "chagok",
  scheme: "chagok",
  version: "0.1.0",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  ios: {
    bundleIdentifier: "dev.doyeon.chagok",
    supportsTablet: true,
    infoPlist: { NSAppTransportSecurity: { NSAllowsLocalNetworking: true } },
  },
  android: { package: "dev.doyeon.chagok" },
  plugins: ["expo-router"],
  web: { bundler: "metro", output: "single" },
};
export default config;
