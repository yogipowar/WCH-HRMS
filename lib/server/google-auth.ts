import { OAuth2Client } from "google-auth-library";

const clientId = () =>
  process.env.GOOGLE_CLIENT_ID?.trim() || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() || "";

const clientSecret = () => process.env.GOOGLE_CLIENT_SECRET?.trim() || "";

export function isGoogleSignInConfigured() {
  return Boolean(clientId());
}

export async function verifyGoogleIdToken(credential: string) {
  const audience = clientId();
  if (!audience) {
    throw new Error("Google Sign-In is not configured.");
  }
  const client = new OAuth2Client(audience, clientSecret() || undefined);
  const ticket = await client.verifyIdToken({
    idToken: credential,
    audience,
  });
  const payload = ticket.getPayload();
  if (!payload?.email || !payload.email_verified) {
    throw new Error("Google account email could not be verified.");
  }
  return {
    email: payload.email.toLowerCase(),
    name: payload.name || "",
    picture: payload.picture || null,
    sub: payload.sub,
  };
}
