import type { ExpoConfig } from "expo/config";

const androidLocal = process.env.CHAGOK_ANDROID_LOCAL === "1";
if (
  androidLocal &&
  process.env.EXPO_PUBLIC_WEB_ORIGIN !== "http://10.0.2.2:3000"
)
  throw new Error(
    "Android local mode requires EXPO_PUBLIC_WEB_ORIGIN=http://10.0.2.2:3000",
  );

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
    ["./plugins/withAndroidNetwork.cjs", { local: androidLocal }],
    "expo-router",
    "expo-secure-store",
    [
      "expo-image-picker",
      {
        photosPermission: "복지비 신청에 첨부할 영수증 사진을 선택합니다.",
        cameraPermission: "복지비 신청에 첨부할 영수증을 촬영합니다.",
        microphonePermission: false,
      },
    ],
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
