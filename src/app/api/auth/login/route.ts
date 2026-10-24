import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { appOrigin, features } from "@/server/config";
import { OAUTH_COOKIE, cookieOptions } from "@/server/session";

/** Only allow redirects back into the app, never to another site. */
function safeReturnTo(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/app/repos";
}

/**
 * Starts GitHub sign-in. By default asks only for the user's public profile.
 * `?private=1` additionally asks for the `repo` scope, which PRISM needs to
 * download private repositories.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  if (!features().auth) {
    // Not set up yet: send people somewhere useful instead of an error.
    return NextResponse.redirect(new URL("/app/new", url));
  }

  const wantsPrivate = url.searchParams.get("private") === "1";
  const returnTo = safeReturnTo(url.searchParams.get("returnTo"));
  const state = randomBytes(16).toString("hex");

  const authorize = new URL("https://github.com/login/oauth/authorize");
  authorize.searchParams.set("client_id", process.env.GITHUB_CLIENT_ID!);
  authorize.searchParams.set("redirect_uri", `${appOrigin(request.url)}/api/auth/callback`);
  authorize.searchParams.set("scope", wantsPrivate ? "read:user repo" : "read:user");
  authorize.searchParams.set("state", state);
  authorize.searchParams.set("allow_signup", "true");

  const res = NextResponse.redirect(authorize);
  res.cookies.set(OAUTH_COOKIE, JSON.stringify({ state, returnTo }), { ...cookieOptions, maxAge: 600 });
  return res;
}
