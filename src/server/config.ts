/*
 * Which integrations are configured. Every feature checks here first, so the
 * app keeps working (in reduced form) when a key hasn't been added yet.
 */

export function features() {
  const secret = process.env.AUTH_SECRET ?? "";
  return {
    auth: Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET && secret.length >= 32),
    authPartial: Boolean(process.env.GITHUB_CLIENT_ID || process.env.GITHUB_CLIENT_SECRET || secret),
    authSecretTooShort: secret.length > 0 && secret.length < 32,
    db: Boolean(process.env.DATABASE_URL),
    ai: Boolean(process.env.ANTHROPIC_API_KEY || process.env.GEMINI_API_KEY),
    githubToken: Boolean(process.env.GITHUB_TOKEN),
  };
}

/** Public origin of the app, used to build the OAuth callback URL. */
export function appOrigin(requestUrl: string) {
  return (process.env.APP_URL || new URL(requestUrl).origin).replace(/\/+$/, "");
}
