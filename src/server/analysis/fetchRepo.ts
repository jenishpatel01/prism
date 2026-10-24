import { gunzipSync } from "node:zlib";

/*
 * Downloads a public GitHub repository as a tarball and unpacks its source files
 * in memory. Uses two GitHub API calls (repo info + tarball). Without a token,
 * GitHub allows 60 API calls per hour per IP; set GITHUB_TOKEN to raise that.
 */

export class AnalysisError extends Error {
  constructor(
    message: string,
    public code: "not_found" | "too_large" | "rate_limited" | "network" | "empty" | "invalid",
  ) {
    super(message);
  }
}

export type RepoInfo = {
  owner: string;
  name: string;
  branch: string;
  description?: string;
  stars: number;
  sizeKb: number;
  private: boolean;
};

export type SourceFile = { path: string; text: string; bytes: number };

const MAX_REPO_KB = 150_000; // GitHub's reported size, includes history
const MAX_FILE_BYTES = 400_000;
const MAX_TOTAL_BYTES = 40_000_000;
const MAX_FILES = 6_000;

const SKIP_DIRS = /(^|\/)(node_modules|\.git|dist|build|out|\.next|\.nuxt|coverage|vendor|bower_components|__pycache__|\.venv|venv|env|site-packages|target|\.turbo|\.cache|\.idea|\.vscode)(\/|$)/;
const TEXT_EXT =
  /\.(ts|tsx|js|jsx|mjs|cjs|py|go|rb|java|kt|rs|php|cs|swift|c|h|cpp|hpp|vue|svelte|json|ya?ml|toml|md|sql|sh|env|html|css|scss|graphql|prisma|txt|cfg|ini|lock)$/i;
const TEXT_NAMES = /(^|\/)(Dockerfile|Makefile|Procfile|requirements[^/]*\.txt|\.env[^/]*|Pipfile|Gemfile)$/;
const MINIFIED = /\.min\.(js|css)$|\.bundle\.js$|\.map$/;

function headers(token?: string): HeadersInit {
  const h: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "prism-code-intelligence",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const auth = token ?? process.env.GITHUB_TOKEN;
  if (auth) h.Authorization = `Bearer ${auth}`;
  return h;
}

async function github(url: string, token?: string): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, { headers: headers(token), redirect: "follow", cache: "no-store" });
  } catch {
    throw new AnalysisError("Couldn't reach GitHub. Check your connection and try again.", "network");
  }
  if (res.status === 404) {
    throw new AnalysisError("Repository not found. It may be private, renamed or misspelled.", "not_found");
  }
  if (res.status === 403 || res.status === 429) {
    throw new AnalysisError(
      "GitHub's hourly limit for anonymous requests was reached. Try again later, or add a GITHUB_TOKEN to the server.",
      "rate_limited",
    );
  }
  if (!res.ok) throw new AnalysisError(`GitHub responded with ${res.status}.`, "network");
  return res;
}

/** `token` is a signed-in user's GitHub token; only then may private repositories be read. */
export async function getRepoInfo(owner: string, name: string, token?: string): Promise<RepoInfo> {
  const res = await github(`https://api.github.com/repos/${owner}/${name}`, token);
  const data = (await res.json()) as {
    name: string;
    owner: { login: string };
    default_branch: string;
    description: string | null;
    stargazers_count: number;
    size: number;
    private: boolean;
  };
  if (data.private && !token) throw new AnalysisError("This repository is private. Private repos need GitHub sign-in.", "not_found");
  if (data.size > MAX_REPO_KB) {
    throw new AnalysisError(
      `This repository is about ${Math.round(data.size / 1000)} MB. The current limit is ${MAX_REPO_KB / 1000} MB.`,
      "too_large",
    );
  }
  return {
    owner: data.owner.login,
    name: data.name,
    branch: data.default_branch,
    description: data.description ?? undefined,
    stars: data.stargazers_count,
    sizeKb: data.size,
    private: data.private,
  };
}

/** Download the branch tarball and return its text source files plus the commit it points at. */
export async function downloadSource(info: RepoInfo, token?: string): Promise<{ files: SourceFile[]; commit: string; skipped: number }> {
  const res = await github(`https://api.github.com/repos/${info.owner}/${info.name}/tarball/${encodeURIComponent(info.branch)}`, token);
  const gz = Buffer.from(await res.arrayBuffer());
  let tar: Buffer;
  try {
    tar = gunzipSync(gz);
  } catch {
    throw new AnalysisError("The repository archive could not be unpacked.", "invalid");
  }
  return untar(tar);
}

/** Minimal tar reader: handles ustar names, GNU long names and pax path headers. */
function untar(buf: Buffer): { files: SourceFile[]; commit: string; skipped: number } {
  const files: SourceFile[] = [];
  let offset = 0;
  let longName: string | null = null;
  let paxPath: string | null = null;
  let commit = "";
  let total = 0;
  let skipped = 0;

  const str = (start: number, len: number) => {
    const s = buf.subarray(start, start + len);
    const end = s.indexOf(0);
    return s.subarray(0, end === -1 ? len : end).toString("utf8");
  };

  while (offset + 512 <= buf.length) {
    if (buf[offset] === 0) break; // end-of-archive blocks
    const name = str(offset, 100);
    const size = parseInt(str(offset + 124, 12).trim() || "0", 8);
    const type = String.fromCharCode(buf[offset + 156] || 48);
    const prefix = str(offset + 345, 155);
    const dataStart = offset + 512;
    const data = buf.subarray(dataStart, dataStart + size);
    offset = dataStart + Math.ceil(size / 512) * 512;

    if (type === "g") {
      // GitHub stores the commit SHA in the global pax header as "comment=<sha>".
      const m = data.toString("utf8").match(/comment=([0-9a-f]{7,40})/);
      if (m) commit = m[1];
      continue;
    }
    if (type === "x") {
      const m = data.toString("utf8").match(/\d+ path=([^\n]+)\n/);
      paxPath = m ? m[1] : null;
      continue;
    }
    if (type === "L") {
      longName = data.toString("utf8").replace(/\0+$/, "");
      continue;
    }

    let full = paxPath ?? longName ?? (prefix ? `${prefix}/${name}` : name);
    paxPath = null;
    longName = null;
    if (type !== "0" && type !== "\0") continue; // only regular files

    // Drop the top-level "<owner>-<repo>-<sha>/" folder.
    full = full.split("/").slice(1).join("/");
    if (!full) continue;
    if (SKIP_DIRS.test(full) || MINIFIED.test(full) || !(TEXT_EXT.test(full) || TEXT_NAMES.test(full))) {
      skipped++;
      continue;
    }
    if (size > MAX_FILE_BYTES || total + size > MAX_TOTAL_BYTES || files.length >= MAX_FILES) {
      skipped++;
      continue;
    }
    const text = data.toString("utf8");
    if (text.includes("\u0000")) {
      skipped++;
      continue;
    }
    total += size;
    files.push({ path: full, text, bytes: size });
  }

  if (!files.length) throw new AnalysisError("No source files were found in this repository.", "empty");
  return { files, commit, skipped };
}
