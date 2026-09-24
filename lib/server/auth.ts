import crypto from "node:crypto";
import type { User } from "@/types";

const COOKIE = "wch_hrms_token";

function secret() {
  return process.env.JWT_SECRET || "wch-hrms-change-this-secret";
}

export function signToken(user: Pick<User, "id" | "role">, remember: boolean) {
  const payload = {
    sub: user.id,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + (remember ? 60 * 60 * 24 * 30 : 60 * 60 * 12),
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyToken(token: string | null) {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as {
    sub: string;
    role: User["role"];
    exp: number;
  };
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

export function tokenFromRequest(request: Request) {
  const header = request.headers.get("authorization") || "";
  if (header.startsWith("Bearer ")) return header.slice(7);
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(/(?:^|;\s*)wch_hrms_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function tokenCookie(token: string, maxAge: number) {
  const secure = process.env.API_COOKIE_SECURE === "true";
  const flags = secure ? "; Secure; SameSite=None" : "; SameSite=Lax";
  return `${COOKIE}=${encodeURIComponent(token)}; HttpOnly; Path=/${flags}; Max-Age=${maxAge}`;
}

export function clearTokenCookie() {
  const secure = process.env.API_COOKIE_SECURE === "true";
  const flags = secure ? "; Secure; SameSite=None" : "; SameSite=Lax";
  return `${COOKIE}=; HttpOnly; Path=/${flags}; Max-Age=0`;
}
