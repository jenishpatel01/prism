import { NextResponse } from "next/server";
import { OAUTH_COOKIE, SESSION_COOKIE, getSession } from "@/server/session";

/**
 * Removes PRISM's access to the user's GitHub account: GitHub deletes the app's
 * authorization and every token issued for it, so the next sign-in has to start
 * from scratch. Failures are ignored; signing out must always work.
 */
async function revokeGitHubAccess(token: string) {
  const id = process.env.GITHUB_CLIENT_ID;
  const secret = process.env.GITHUB_CLIENT_SECRET;
  if (!id || !secret) return;
  try {
    await fetch(`https://api.github.com/applications/${id}/grant`, {
      method: "DELETE",
      headers: {
        Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "User-Agent": "prism-code-intelligence",
      },
      body: JSON.stringify({ access_token: token }),
      signal: AbortSignal.timeout(8000),
    });
  } catch {}
}

/**
 * Signs out. POST only, so a link or image elsewhere can't sign people out.
 * Ends the PRISM session, revokes PRISM's GitHub access, then opens GitHub's own
 * sign-out page (GitHub asks for one confirming click; a site can't sign someone
 * out of github.com by itself).
 */
export async function POST() {
  const session = await getSession();
  if (session) await revokeGitHubAccess(session.token);

  const res = NextResponse.redirect("https://github.com/logout", 303);
  res.cookies.delete(SESSION_COOKIE);
  res.cookies.delete(OAUTH_COOKIE);
  return res;
}
