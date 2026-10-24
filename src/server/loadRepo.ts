import type { AnalysisResult } from "@/lib/analysisTypes";
import { analyzeRepo, analyzeWithToken, type AnalyzeOutcome } from "./analysis";
import { features } from "./config";
import { recentResult, repoHistory, saveAnalysis, type SavedRow } from "./db";
import { getSession, type Session } from "./session";

/*
 * Loads the analysis a repo page shows:
 * 1. public repos come from the shared cache (anyone can view them);
 * 2. if that says "not found" and the user granted private access, analyze with
 *    their own token (reusing a saved result from the last 30 minutes);
 * 3. signed-in users get each analysis saved and their past scores attached.
 */

export type RepoLoad =
  | { ok: true; result: AnalysisResult; session: Session | null }
  | { ok: false; error: string; signInForPrivate?: boolean; grantPrivate?: boolean };

const NAME = /^[\w.-]{1,100}$/;

function when(d: Date) {
  return new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function withHistory(r: AnalysisResult, rows: SavedRow[]): AnalysisResult {
  if (!rows.length) return r;
  const prev = rows.find((row) => row.commit_sha !== r.repo.commit);
  const scores = [...rows].reverse().map((row) => row.score);
  return {
    ...r,
    health: { ...r.health, previous: prev?.score, history: scores.length >= 2 ? scores : undefined },
    history: rows.slice(0, 6).map((row) => ({
      commit: row.commit_sha,
      message: `${row.issues} issues · ${row.critical} critical`,
      when: when(row.created_at),
      score: row.score,
      issues: row.issues,
    })),
  };
}

export async function loadRepo(owner: string, repo: string): Promise<RepoLoad> {
  if (!NAME.test(owner) || !NAME.test(repo)) return { ok: false, error: "That doesn't look like a GitHub repository name." };

  const session = await getSession();
  let out: AnalyzeOutcome = await analyzeRepo(owner.toLowerCase(), repo.toLowerCase());

  if (!out.ok && out.code === "not_found") {
    if (!session) {
      return { ok: false, error: out.error, signInForPrivate: features().auth };
    }
    if (!session.scopes.includes("repo")) {
      return { ok: false, error: "This repository is private or doesn't exist. To analyze private repositories, allow PRISM to read them.", grantPrivate: true };
    }
    const recent = await recentResult(session.githubId, owner, repo, 30);
    out = recent ? { ok: true, result: recent } : await analyzeWithToken(owner, repo, session.token);
  }

  if (!out.ok) return { ok: false, error: out.error };

  let result = out.result;
  if (session && features().db) {
    await saveAnalysis(session, result);
    result = withHistory(result, await repoHistory(session.githubId, result.repo.owner, result.repo.name));
  }
  return { ok: true, result, session };
}
