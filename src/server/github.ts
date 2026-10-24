/**
 * Removes PRISM's access to a user's GitHub account: GitHub deletes the app's
 * authorization and every token issued for it, so the next sign-in has to start
 * from scratch. Failures are ignored; signing out or deleting data must always work.
 */
export async function revokeGitHubAccess(token: string) {
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
