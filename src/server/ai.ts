import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { cacheLife } from "next/cache";
import { z } from "zod";
import type { AnalysisResult } from "@/lib/analysisTypes";

/*
 * Claude (or Gemini's free tier) explains what the deterministic analysis found. It receives only the
 * facts (findings, locations, metrics), never source code, and must cite the
 * issue ids it talks about so every claim links back to evidence.
 */

const MODEL = "claude-sonnet-5-5";

const ReviewSchema = z.object({
  headline: z.string().describe("One sentence, under 16 words: the single most important takeaway."),
  overview: z.string().describe("2–3 sentences on the overall state of the codebase, grounded in the metrics."),
  points: z
    .array(
      z.object({
        text: z.string().describe("One or two sentences. What matters and why, in plain language."),
        issueIds: z.array(z.string()).describe("Issue ids this point is based on, from the facts. Empty if it's about metrics."),
      }),
    )
    .describe("Exactly 3 points, most important first."),
  reviews: z
    .array(
      z.object({
        issueId: z.string(),
        explanation: z.string().describe("Why this finding matters in this codebase, 1–3 sentences."),
        fix: z.string().describe("A concrete next step to fix it, 1–3 sentences. Mention specific APIs or patterns."),
        priority: z.enum(["now", "soon", "later"]),
        falsePositiveRisk: z.enum(["low", "medium", "high"]).describe("How likely the static rule misfired here."),
      }),
    )
    .describe("One entry per issue in the facts, in the same order."),
});

export type AiReview = z.infer<typeof ReviewSchema> & { model: string };

const SYSTEM = `You are the explanation layer of PRISM, a code intelligence platform.
PRISM has already analyzed a repository with deterministic tools: parsing, AST rules, a dependency graph, secret scanning and a vulnerability database. You receive those facts as JSON.

Your job is to explain the facts to the repository's developers: what matters most, why, and what to do next.
- Use only the facts provided. Never invent files, line numbers, packages, vulnerabilities or numbers.
- Refer to findings by their issue id (for example PR-1A2B3) in issueIds; don't paste ids into prose.
- Static rules can misfire. When a finding looks like a likely false positive (for example a pattern inside a test helper or a constant string), say so in falsePositiveRisk rather than overstating it.
- Write for experienced developers: specific, calm, no hype, no filler. Plain sentences, no markdown.`;

/** The subset of an analysis Claude needs. Small enough to send, and stable for caching. */
function factsOf(r: AnalysisResult) {
  return {
    repository: `${r.repo.owner}/${r.repo.name}`,
    commit: r.repo.commit,
    description: r.repo.description ?? null,
    languages: r.repo.languages,
    health: r.health,
    stats: r.stats,
    issueCounts: { bySeverity: r.severityCounts, byCategory: r.categories.map((c) => ({ category: c.key, count: c.count })) },
    issues: r.issues.slice(0, 10).map((i) => ({
      id: i.id,
      severity: i.severity,
      category: i.category,
      title: i.title,
      location: i.location,
      foundBy: i.source,
      impact: i.impact,
      riskScore: i.risk,
      ruleNote: i.detail ?? null,
    })),
    hotspots: r.hotspots,
    quality: r.quality.map((q) => ({ metric: q.label, value: `${q.value}${q.unit}`, note: q.note ?? null })),
    analysisNotes: r.notes,
  };
}

async function callClaude(facts: ReturnType<typeof factsOf>): Promise<AiReview | null> {
  const client = new Anthropic({ timeout: 90_000, maxRetries: 1 });
  try {
    const response = await client.beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      // If Claude declines for safety reasons, the API retries on a fallback model automatically.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "high", format: betaZodOutputFormat(ReviewSchema) },
      system: SYSTEM,
      messages: [{ role: "user", content: `Analysis facts:\n${JSON.stringify(facts, null, 2)}` }],
    });
    if (response.stop_reason === "refusal" || !response.parsed_output) return null;
    return { ...response.parsed_output, model: response.model };
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) console.error("PRISM AI: ANTHROPIC_API_KEY was rejected.");
    else if (e instanceof Anthropic.RateLimitError) console.error("PRISM AI: rate limited by the Claude API.");
    else if (e instanceof Anthropic.APIError) console.error(`PRISM AI: Claude API error ${e.status}`, e.message);
    else console.error("PRISM AI: request failed", e);
    throw e; // don't cache failures
  }
}

/*
 * Free alternative: Google Gemini's free tier. Used only when no Claude key is
 * set. Plain REST, so no extra dependency; the reply is validated with the same
 * schema as Claude's.
 */

// Tried in order; the free tier is shared, so a busy model falls through to the next one.
const GEMINI_MODELS = [process.env.GEMINI_MODEL, "gemini-3.5-flash", "gemini-3.6-flash", "gemini-3.8-flash"].filter(
  (m, i, all): m is string => Boolean(m) && all.indexOf(m) === i,
);

const JSON_SHAPE = `Reply with a single JSON object and nothing else, in exactly this shape:
{
  "headline": string (one sentence, under 16 words),
  "overview": string (2-3 sentences grounded in the metrics),
  "points": [ { "text": string, "issueIds": string[] } ]   // exactly 3, most important first
  "reviews": [ { "issueId": string, "explanation": string, "fix": string, "priority": "now" | "soon" | "later", "falsePositiveRisk": "low" | "medium" | "high" } ]   // one per issue in the facts, same order
}`;

async function geminiRequest(model: string, facts: ReturnType<typeof factsOf>): Promise<Response> {
  return fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY! },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: `${SYSTEM}\n\n${JSON_SHAPE}` }] },
      contents: [{ role: "user", parts: [{ text: `Analysis facts:\n${JSON.stringify(facts, null, 2)}` }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
    }),
    signal: AbortSignal.timeout(45_000),
  });
}

async function callGemini(facts: ReturnType<typeof factsOf>): Promise<AiReview | null> {
  let lastError = "no model answered";
  for (const model of GEMINI_MODELS) {
    let res: Response;
    try {
      res = await geminiRequest(model, facts);
    } catch (e) {
      lastError = `${model}: ${e instanceof Error ? e.name : "request failed"}`; // timeout or network: try the next model
      continue;
    }
    if (res.status === 400 || res.status === 403) {
      console.error("PRISM AI: GEMINI_API_KEY was rejected.");
      throw new Error(`Gemini ${res.status}`);
    }
    if (!res.ok) {
      lastError = `${model}: HTTP ${res.status}`; // busy (503), rate limited (429) or retired (404): try the next model
      continue;
    }
    const body = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const text = body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    let parsed;
    try {
      parsed = ReviewSchema.safeParse(JSON.parse(text));
    } catch {
      lastError = `${model}: reply was not JSON`;
      continue;
    }
    if (!parsed.success) {
      lastError = `${model}: reply did not match the expected shape`;
      continue;
    }
    return { ...parsed.data, model };
  }
  console.error(`PRISM AI: Gemini unavailable (${lastError})`);
  throw new Error("Gemini unavailable"); // don't cache failures
}

/** Cached per repository and commit, so each analysis is explained once. */
async function cachedReview(key: string, facts: ReturnType<typeof factsOf>) {
  "use cache";
  cacheLife("days");
  void key; // part of the cache key
  return process.env.ANTHROPIC_API_KEY ? callClaude(facts) : callGemini(facts);
}

/** The AI review of an analysis, or null if no AI key is configured or the call failed. */
export async function reviewAnalysis(r: AnalysisResult): Promise<AiReview | null> {
  if (!(process.env.ANTHROPIC_API_KEY || process.env.GEMINI_API_KEY) || r.demo) return null;
  try {
    return await cachedReview(`${r.repo.owner}/${r.repo.name}@${r.repo.commit}`.toLowerCase(), factsOf(r));
  } catch {
    return null;
  }
}
