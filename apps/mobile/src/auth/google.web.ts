// Browser preview is for layout checks. Native Google login is verified in a Development Build.
export const googleConfigured = false;
export const google = {
  async signIn(): Promise<{ type: "cancelled" }> {
    throw new Error("Use the native app for Google login");
  },
  async signOut() {},
};
