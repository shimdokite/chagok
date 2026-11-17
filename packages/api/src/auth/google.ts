import { OAuth2Client } from "google-auth-library";

const client = new OAuth2Client();

// The SDK verifies the signature against Google's rotating keys, issuer,
// audience, and expiry. Never trust a client-decoded JWT or a client user id.
export async function verifyGoogle(idToken: string) {
  const audience = process.env.GOOGLE_WEB_CLIENT_ID;
  if (!audience) throw new Error("Google authentication is not configured");
  const ticket = await client.verifyIdToken({ idToken, audience });
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email_verified)
    throw new Error("Invalid identity");
  return { sub: payload.sub };
}
