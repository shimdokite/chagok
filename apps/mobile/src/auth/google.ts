import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import { Platform } from "react-native";

const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
export const googleConfigured = Boolean(
  webClientId && (Platform.OS !== "ios" || iosClientId),
);
if (googleConfigured)
  GoogleSignin.configure({ webClientId, iosClientId, offlineAccess: false });
export const google = {
  async signIn(): Promise<
    { type: "success"; idToken: string } | { type: "cancelled" }
  > {
    if (!googleConfigured) throw new Error("Google login is not configured");
    try {
      if (Platform.OS === "android")
        await GoogleSignin.hasPlayServices({
          showPlayServicesUpdateDialog: true,
        });
      const response = await GoogleSignin.signIn();
      if (response.type === "cancelled") return { type: "cancelled" };
      if (!response.data.idToken) throw new Error("Missing ID token");
      return { type: "success", idToken: response.data.idToken };
    } catch (error) {
      if (
        isErrorWithCode(error) &&
        error.code === statusCodes.SIGN_IN_CANCELLED
      )
        return { type: "cancelled" };
      throw error;
    }
  },

  signOut: () => GoogleSignin.signOut(),
};
