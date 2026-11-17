import { afterEach, expect, it, vi } from "vitest";
import { OAuth2Client, LoginTicket } from "google-auth-library";
import { verifyGoogle } from "./google";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});
it("passes only the configured server audience to Google verification", async () => {
  vi.stubEnv("GOOGLE_WEB_CLIENT_ID", "server.apps.googleusercontent.com");
  const verify = vi
    .spyOn(OAuth2Client.prototype, "verifyIdToken")
    .mockImplementation(
      async () =>
        new LoginTicket("header", {
          iss: "https://accounts.google.com",
          sub: "stable-sub",
          aud: "server.apps.googleusercontent.com",
          exp: 9999999999,
          iat: 1,
          email_verified: true,
        }),
    );
  expect(await verifyGoogle("opaque-id-token")).toEqual({ sub: "stable-sub" });
  expect(verify).toHaveBeenCalledWith({
    idToken: "opaque-id-token",
    audience: "server.apps.googleusercontent.com",
  });
});
it("rejects missing configuration before contacting Google", async () => {
  vi.stubEnv("GOOGLE_WEB_CLIENT_ID", "");
  const verify = vi.spyOn(OAuth2Client.prototype, "verifyIdToken");
  await expect(verifyGoogle("token")).rejects.toThrow();
  expect(verify).not.toHaveBeenCalled();
});
it.each(["wrong signature", "wrong audience", "expired token"])(
  "rejects SDK verification failure: %s",
  async (message) => {
    vi.stubEnv("GOOGLE_WEB_CLIENT_ID", "server.apps.googleusercontent.com");
    vi.spyOn(OAuth2Client.prototype, "verifyIdToken").mockRejectedValue(
      new Error(message),
    );
    await expect(verifyGoogle("invalid")).rejects.toThrow(message);
  },
);
