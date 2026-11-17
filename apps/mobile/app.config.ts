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
  plugins: [
    "expo-router",
    "expo-secure-store",
    ...(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
      ? [
          [
            "@react-native-google-signin/google-signin",
            {
              iosUrlScheme: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID.split(
                ".",
              )
                .reverse()
                .join("."),
            },
          ] as [string, Record<string, string>],
        ]
      : []),
  ],
  web: { bundler: "metro", output: "single" },
};
export default config;
