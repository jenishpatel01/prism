import { NextResponse, type NextRequest } from "next/server";
import { deleteUserData } from "@/server/db";
import { revokeGitHubAccess } from "@/server/github";
import { OAUTH_COOKIE, SESSION_COOKIE, getSession } from "@/server/session";

/**
 * Deletes the signed-in user's PRISM data (profile and every saved analysis),
 * removes PRISM's access to their GitHub account and signs them out.
 * POST only, and it needs the session cookie, so it can't be triggered from another site.
 */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.redirect(new URL("/app/account", request.url), 303);

  // Data first: if it fails, keep the session so the user can try again.
  const deleted = await deleteUserData(session.githubId);
  if (!deleted) return NextResponse.redirect(new URL("/app/account?error=1", request.url), 303);

  await revokeGitHubAccess(session.token);

  const res = NextResponse.redirect(new URL("/?account_deleted=1", request.url), 303);
  res.cookies.delete(SESSION_COOKIE);
  res.cookies.delete(OAUTH_COOKIE);
  return res;
}
