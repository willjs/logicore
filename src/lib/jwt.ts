import { SignJWT, jwtVerify } from "jose";
import type { JWTPayload } from "jose";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "erpbod-dev-secret",
);

export interface TokenPayload {
  sub: string;
  email: string;
  name: string;
}

export async function signToken(payload: TokenPayload): Promise<string> {
  const expiresIn = process.env.JWT_EXPIRES_IN ?? "12h";
  const claims: JWTPayload = { ...payload };
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret);
}

export async function verifyToken(
  token: string,
): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return {
      sub: String(payload.sub ?? ""),
      email: String(payload.email ?? ""),
      name: String(payload.name ?? ""),
    };
  } catch {
    return null;
  }
}
