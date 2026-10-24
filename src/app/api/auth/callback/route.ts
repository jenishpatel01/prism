import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { appOrigin, features } from "@/server/config";
import { upsertUser } from "@/server/db";
import { OAUTH_COOKIE, sealSession } from "@/server/session";

function fail(request: NextRequest, reason: string) {
  const to = new URL("/app/setup", request.url);
  to.searchParams.set("auth_error", reason);
  const res = NextResponse.redirect(to);
  res.cookies.delete(OAUTH_COOKIE);
  return res;
}

/** GitHub sends the user back here with a one-time code, which we swap for an access token. */
export async function GET(request: NextRequest) {
  if (!features().auth) return fail(request, "GitHub sign-in isn't configured on the server.");

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (url.searchParams.get("error")) return fail(request, url.searchParams.get("error_description") ?? "GitHub sign-in was cancelled.");

  let saved: { state: string; returnTo: string } | null = null;
  try {
    saved = JSON.parse(request.cookies.get(OAUTH_COOKIE)?.value ?? "null");
  } catch {}
  const valid =
    code &&
    state &&
    saved &&
    state.length === saved.state.length &&
    timingSafeEqual(Buffer.from(state), Buffer.from(saved.state));
  if (!valid) return fail(request, "The sign-in link expired or didn't match. Please try again.");

  // Exchange the code for a token.
  let token: string;
  let scopes: string[];
  try {
    const res = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: `${appOrigin(request.url)}/api/auth/callback`,
      }),
      cache: "no-store",
    });
    const data = (await res.json()) as { access_token?: string; scope?: string; error_description?: string };
    if (!data.access_token) return fail(request, data.error_description ?? "GitHub didn't return an access token.");
    token = data.access_token;
    scopes = (data.scope ?? "").split(/[,\s]+/).filter(Boolean);
  } catch {
    return fail(request, "Couldn't reach GitHub to finish signing in.");
  }

  // Who signed in.
  const userRes = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "User-Agent": "prism-code-intelligence" },
    cache: "no-store",
  });
  if (!userRes.ok) return fail(request, "Couldn't read your GitHub profile.");
  const user = (await userRes.json()) as { id: number; login: string; name: string | null; avatar_url: string };

  const session = { githubId: user.id, login: user.login, name: user.name, avatar: user.avatar_url, token, scopes };
  await upsertUser(session); // no-op without a database

  const res = NextResponse.redirect(new URL(saved!.returnTo, url));
  const cookie = await sealSession(session);
  res.cookies.set(cookie.name, cookie.value, cookie.options);
  res.cookies.delete(OAUTH_COOKIE);
  return res;
}
