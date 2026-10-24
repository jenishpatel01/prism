import { NextResponse } from "next/server";
import { revokeGitHubAccess } from "@/server/github";
import { OAUTH_COOKIE, SESSION_COOKIE, getSession } from "@/server/session";

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
