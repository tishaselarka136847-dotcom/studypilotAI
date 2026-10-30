import type { SummaryLength, SummaryType } from "./types";

/** Browser-based extractive summarizer (term-frequency scoring). NOT an AI model. */

const STOP = new Set(
  "a an the and or but if then else of to in on at by for with from as is are was were be been being it its this that these those which who whom whose what when where why how not no nor so than too very can could may might must shall should will would do does did done have has had having i you he she we they them his her our their my your also such into over under about between during each other more most some any all both few many much one two three there here just only own same while because however therefore thus etc using used use based per via".split(" ")
);

export interface SummaryResult {
  summary: string[];
  keywords: string[];
  definitions: string[];
  revision: string[];
  stats: { sentences: number; words: number };
}

export function splitSentences(text: string): string[] {
  return text
    .replace(/\r/g, "")
    .split(/(?<=[.!?])\s+|\n{1,}/)
    .map((s) => s.replace(/^[\s\-•*\d.)]+/, "").trim())
    .filter((s) => s.split(/\s+/).length >= 4);
}

function words(s: string): string[] {
  return (s.toLowerCase().match(/[a-z][a-z'\-]+|\d+/g) || []).filter((w) => w.length > 2 && !STOP.has(w));
}

const DEF_RE = /^(.{2,70}?)\s+(?:is defined as|is called|refers to|is known as|are called|means|is an?|is the|are the|are)\s+(.{8,})$/i;

function shorten(s: string, max: number): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const clause = Math.max(cut.lastIndexOf(","), cut.lastIndexOf(";"), cut.lastIndexOf(" — "));
  return (clause > max * 0.5 ? cut.slice(0, clause) : cut.slice(0, cut.lastIndexOf(" "))).replace(/[,;:\s]+$/, "") + "…";
}

export function summarize(text: string, length: SummaryLength, type: SummaryType): SummaryResult {
  const sents = splitSentences(text);
  const allWords = text.trim() ? text.trim().split(/\s+/).length : 0;
  const tf: Record<string, number> = {};
  for (const s of sents) for (const w of words(s)) tf[w] = (tf[w] || 0) + 1;
  const ranked = Object.entries(tf).sort((a, b) => b[1] - a[1] || b[0].length - a[0].length);
  const repeated = ranked.filter(([, c]) => c >= 2);
  const kwCount = length === "Short" ? 5 : length === "Medium" ? 8 : 12;
  const keywords = (repeated.length >= 3 ? repeated : ranked).slice(0, kwCount).map(([w]) => w);
  const kwSet = new Set(keywords);

  const scored = sents.map((s, i) => {
    const ws = words(s);
    const freq = ws.reduce((a, w) => a + (tf[w] || 0) + (kwSet.has(w) ? 2 : 0), 0);
    let score = freq / Math.pow(Math.max(ws.length, 1), 0.65);
    if (DEF_RE.test(s)) score *= 1.35;
    if (i === 0) score *= 1.2;
    if (s.length > 320) score *= 0.7;
    if (/\b(therefore|important|key|main|first|finally|in summary|remember|note that)\b/i.test(s)) score *= 1.15;
    return { s, i, score };
  });

  const base = length === "Short" ? 3 : length === "Medium" ? 5 : 8;
  const n = Math.min(base, Math.max(1, Math.ceil(sents.length * 0.6)));
  const picked = [...scored].sort((a, b) => b.score - a.score).slice(0, n).sort((a, b) => a.i - b.i);

  let summary: string[];
  if (type === "Key Points") summary = picked.map((p) => shorten(p.s, 150));
  else if (type === "Simple Explanation") {
    summary = [
      picked
        .map((p) => p.s.replace(/\s*\([^)]*\)/g, "").trim())
        .join(" "),
    ];
  } else summary = picked.map((p) => p.s);

  const definitions: string[] = [];
  for (const s of sents) {
    const m = s.match(DEF_RE);
    if (m && words(m[1]).length <= 5 && words(m[1]).length >= 1) {
      definitions.push(`${m[1].trim()} — ${shorten(m[2].trim().replace(/[.]$/, ""), 140)}`);
    }
    if (definitions.length >= (length === "Short" ? 2 : length === "Medium" ? 4 : 6)) break;
  }

  const revision: string[] = [];
  const used = new Set<string>();
  keywords.slice(0, type === "Exam Revision" ? 5 : 3).forEach((kw) => {
    const ref = sents.find((s) => s.toLowerCase().includes(kw) && !used.has(s));
    if (ref) used.add(ref);
    revision.push(ref ? `Explain “${kw}” in your own words — see: ${shorten(ref, 110)}` : `Explain “${kw}” in your own words.`);
  });
  if (type === "Exam Revision") revision.push("Close your notes and write the key points from memory, then compare.");

  return { summary, keywords, definitions, revision, stats: { sentences: sents.length, words: allWords } };
}

export function summaryToText(title: string, s: { summary: string[]; keywords: string[]; definitions: string[]; revision: string[] }): string {
  const lines = [title, "(AI Demo Mode — browser-based text processing)", "", "SUMMARY", ...s.summary.map((x) => `• ${x}`)];
  if (s.keywords.length) lines.push("", "KEYWORDS: " + s.keywords.join(", "));
  if (s.definitions.length) lines.push("", "DEFINITIONS", ...s.definitions.map((x) => `• ${x}`));
  if (s.revision.length) lines.push("", "REVISION", ...s.revision.map((x) => `☐ ${x}`));
  return lines.join("\n");
}
