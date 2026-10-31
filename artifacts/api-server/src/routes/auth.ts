import { GetCurrentAuthUserResponse } from "@workspace/api-zod";
import { db, usersTable } from "@workspace/db";
import { Router, type IRouter, type Request, type Response } from "express";
import * as oidc from "openid-client";
import {
  clearSession,
  createSession,
  getOidcConfig,
  getSessionId,
  ISSUER_URL,
  SESSION_COOKIE,
  SESSION_TTL,
  type SessionData,
} from "../lib/auth";

const router: IRouter = Router();
const OIDC_COOKIE_TTL = 10 * 60 * 1000;

function getOrigin(req: Request): string {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost";
  return `${proto}://${host}`;
}

function safeReturnTo(value: unknown): string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/";
}

function setCookie(res: Response, name: string, value: string, maxAge: number) {
  res.cookie(name, value, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

async function upsertUser(claims: Record<string, unknown>) {
  if (typeof claims.sub !== "string" || !claims.sub) throw new Error("OIDC identity is missing.");
  const userData = {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : null,
    firstName: typeof claims.first_name === "string" ? claims.first_name : null,
    lastName: typeof claims.last_name === "string" ? claims.last_name : null,
    profileImageUrl:
      typeof claims.profile_image_url === "string"
        ? claims.profile_image_url
        : typeof claims.picture === "string"
          ? claims.picture
          : null,
  };
  const [user] = await db
    .insert(usersTable)
    .values(userData)
    .onConflictDoUpdate({
      target: usersTable.id,
      set: { ...userData, updatedAt: new Date() },
    })
    .returning();
  return user;
}

router.get("/auth/user", (req: Request, res: Response) => {
  res.json(GetCurrentAuthUserResponse.parse({ user: req.isAuthenticated() ? req.user : null }));
});

router.get("/login", async (req: Request, res: Response, next) => {
  try {
    const config = await getOidcConfig();
    const callbackUrl = `${getOrigin(req)}/api/callback`;
    const state = oidc.randomState();
    const nonce = oidc.randomNonce();
    const codeVerifier = oidc.randomPKCECodeVerifier();
    const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);
    const authorizationUrl = oidc.buildAuthorizationUrl(config, {
      redirect_uri: callbackUrl,
      scope: "openid email profile offline_access",
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      state,
      nonce,
    });
    const returnTo = safeReturnTo(req.query.returnTo);
    setCookie(res, "code_verifier", codeVerifier, OIDC_COOKIE_TTL);
    setCookie(res, "nonce", nonce, OIDC_COOKIE_TTL);
    setCookie(res, "state", state, OIDC_COOKIE_TTL);
    setCookie(res, "return_to", returnTo, OIDC_COOKIE_TTL);
    return res.redirect(authorizationUrl.href);
  } catch (error) {
    return next(error);
  }
});

router.get("/callback", async (req: Request, res: Response, next) => {
  try {
    const callbackUrl = `${getOrigin(req)}/api/callback`;
    const verifier = req.cookies?.code_verifier;
    const expectedState = req.cookies?.state;
    const nonce = req.cookies?.nonce;
    if (!verifier || !expectedState) return res.redirect("/api/login");

    const callback = new URL(callbackUrl);
    for (const [key, value] of new URL(req.url, "http://localhost").searchParams) {
      callback.searchParams.append(key, value);
    }
    const tokens = await oidc.authorizationCodeGrant(await getOidcConfig(), callback, {
      pkceCodeVerifier: verifier,
      expectedNonce: nonce,
      expectedState,
      idTokenExpected: true,
    });
    const claims = tokens.claims();
    if (!claims) return res.redirect("/api/login");
    const user = await upsertUser(claims as unknown as Record<string, unknown>);
    const now = Math.floor(Date.now() / 1000);
    const session: SessionData = {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
      },
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.expiresIn() ? now + tokens.expiresIn()! : claims.exp,
    };
    const sid = await createSession(session);
    setCookie(res, SESSION_COOKIE, sid, SESSION_TTL);
    for (const name of ["code_verifier", "nonce", "state", "return_to"]) {
      res.clearCookie(name, { path: "/" });
    }
    return res.redirect(safeReturnTo(req.cookies?.return_to));
  } catch (error) {
    return next(error);
  }
});

router.get("/logout", async (req: Request, res: Response, next) => {
  try {
    const config = await getOidcConfig();
    const origin = getOrigin(req);
    const returnTo = safeReturnTo(req.query.returnTo);
    const sid = getSessionId(req);
    await clearSession(res, sid);
    const endSessionUrl = oidc.buildEndSessionUrl(config, {
      client_id: process.env.REPL_ID!,
      post_logout_redirect_uri: new URL(returnTo, `${origin}/`).href,
    });
    return res.redirect(endSessionUrl.href);
  } catch (error) {
    return next(error);
  }
});

export default router;
