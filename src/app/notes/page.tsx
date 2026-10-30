"use client";

import { useState } from "react";
import { Copy, FileText, Save, Sparkles, Trash2, RefreshCw, BookmarkCheck } from "lucide-react";
import { useStore, withLog } from "@/lib/store";
import { summarize, summaryToText, type SummaryResult } from "@/lib/summarizer";
import type { SummaryLength, SummaryType } from "@/lib/types";
import { fmtDate, uid } from "@/lib/utils";
import { AIBadge, ConfirmDialog, DemoNotice, EmptyState, Field, PageHeader, Segmented } from "@/components/ui";

const SAMPLE = `A stack is a linear data structure that follows the last in, first out principle. The main operations of a stack are push and pop. Push adds an element to the top of the stack, and pop removes the top element. A queue is a linear data structure that follows the first in, first out principle. Queues are used in scheduling and in breadth first search. Stacks are used in recursion, undo features and expression evaluation. Both stacks and queues can be implemented with arrays or linked lists. The time complexity of push and pop on a stack is constant.`;

export default function NotesPage() {
  const { data, update, toast } = useStore();
  const [subjectId, setSubjectId] = useState(data.subjects[0]?.id ?? "");
  const [text, setText] = useState("");
  const [length, setLength] = useState<SummaryLength>("Medium");
  const [type, setType] = useState<SummaryType>("Key Points");
  const [result, setResult] = useState<SummaryResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [title, setTitle] = useState("");
  const [del, setDel] = useState<string | null>(null);

  const run = () => {
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    if (words < 25) return setErr("Please paste at least 25 words of notes so there is enough text to analyse.");
    if (words > 20000) return setErr("That's a lot of text — please paste under 20,000 words at a time.");
    setErr("");
    setBusy(true);
    setTimeout(() => {
      const r = summarize(text, length, type);
      setResult(r);
      setBusy(false);
      if (!title) setTitle(`${data.subjects.find((s) => s.id === subjectId)?.name ?? "General"} — ${type}`);
    }, 450);
  };

  const copy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(summaryToText(title || "Summary", result));
      toast("Summary copied to clipboard");
    } catch {
      toast("Copy isn't available in this browser context.", "error");
    }
  };

  const save = () => {
    if (!result) return;
    const t = (title || "Untitled summary").trim();
    update((d) =>
      withLog(
        { ...d, summaries: [{ id: uid("sum"), subjectId, title: t, length, type, source: text.slice(0, 20000), summary: result.summary, keywords: result.keywords, definitions: result.definitions, revision: result.revision, createdAt: new Date().toISOString() }, ...d.summaries] },
        "summary",
        `Saved summary “${t}”`
      )
    );
    toast("Summary saved");
  };

  return (
    <div className="fade-up">
      <PageHeader title="Notes Summarizer" badge={<AIBadge />} subtitle="Paste lecture notes and get an extractive summary, keywords and a revision list." />
      <div className="mb-5"><DemoNotice><b>AI Demo Mode</b> — This summary is generated using browser-based text processing. Verify important academic information with your original notes.</DemoNotice></div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="card space-y-4 p-5 lg:col-span-5">
          <Field label="Subject" htmlFor="ns">
            <select id="ns" className="input" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              <option value="">General (no subject)</option>
              {data.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Your notes" htmlFor="nt" error={err}>
            <textarea id="nt" className="input min-h-[220px] resize-y" placeholder="Paste or type your notes here…" value={text} onChange={(e) => setText(e.target.value)} />
            <div className="mt-1 flex items-center justify-between text-xs text-muted">
              <span className="tnum">{text.trim() ? text.trim().split(/\s+/).length : 0} words</span>
              <button className="font-semibold text-primary" onClick={() => setText(SAMPLE)}>Use sample notes</button>
            </div>
          </Field>
          <div>
            <span className="label">Summary length</span>
            <Segmented<SummaryLength> label="Summary length" value={length} onChange={setLength} options={["Short", "Medium", "Detailed"].map((v) => ({ value: v as SummaryLength, label: v }))} />
          </div>
          <div>
            <span className="label">Summary type</span>
            <Segmented<SummaryType> label="Summary type" value={type} onChange={setType} options={["Simple Explanation", "Exam Revision", "Key Points"].map((v) => ({ value: v as SummaryType, label: v }))} />
          </div>
          <button className="btn-ai w-full" disabled={busy} onClick={() => run()}>
            {busy ? <><RefreshCw className="h-4 w-4 animate-spin" /> Processing…</> : <><Sparkles className="h-4 w-4" /> Summarize notes</>}
          </button>
        </section>

        <section className="card p-5 lg:col-span-7">
          {!result ? (
            <EmptyState icon={<FileText className="h-6 w-6" />} title="Your summary will appear here" text="Paste your notes, choose a length and type, then press Summarize." />
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <input aria-label="Summary title" className="input max-w-xs !font-semibold" value={title} onChange={(e) => setTitle(e.target.value)} />
                <div className="flex flex-wrap gap-2">
                  <button className="btn-secondary btn-sm" onClick={copy}><Copy className="h-3.5 w-3.5" /> Copy</button>
                  <button className="btn-secondary btn-sm" disabled={busy} onClick={() => run()}><RefreshCw className="h-3.5 w-3.5" /> Regenerate</button>
                  <button className="btn-primary btn-sm" onClick={save}><Save className="h-3.5 w-3.5" /> Save</button>
                </div>
              </div>
              <p className="text-xs text-muted">Analysed {result.stats.sentences} sentences / {result.stats.words} words · {length} · {type}</p>
              <div>
                <h3 className="h2 mb-2">Summary</h3>
                {type === "Simple Explanation" ? <p className="text-sm leading-relaxed">{result.summary[0]}</p> : <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed">{result.summary.map((s, i) => <li key={i}>{s}</li>)}</ul>}
              </div>
              {result.keywords.length > 0 && (
                <div><h3 className="h2 mb-2">Important keywords</h3><div className="flex flex-wrap gap-1.5">{result.keywords.map((k) => <span key={k} className="pill-blue">{k}</span>)}</div></div>
              )}
              {result.definitions.length > 0 && (
                <div><h3 className="h2 mb-2">Detected definitions</h3><ul className="space-y-1.5 text-sm">{result.definitions.map((d, i) => <li key={i} className="rounded-lg bg-surface-low px-3 py-2">{d}</li>)}</ul></div>
              )}
              <div className="rounded-xl border border-teal/25 bg-teal-soft p-4">
                <h3 className="h2 mb-2 text-base">Revision checklist</h3>
                <ul className="space-y-1.5 text-sm">{result.revision.map((r, i) => <li key={i} className="flex gap-2"><span aria-hidden>☐</span><span className="break-words">{r}</span></li>)}</ul>
              </div>
            </div>
          )}
        </section>
      </div>

      <section className="mt-8">
        <h2 className="h2 mb-3 flex items-center gap-2"><BookmarkCheck className="h-5 w-5 text-primary" /> Saved summaries ({data.summaries.length})</h2>
        {data.summaries.length === 0 ? (
          <div className="card p-4"><EmptyState icon={<BookmarkCheck className="h-5 w-5" />} title="No saved summaries" text="Generate a summary and press Save to keep it here." /></div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {data.summaries.map((s) => (
              <article key={s.id} className="card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0"><h3 className="break-words font-display font-semibold">{s.title}</h3><p className="text-xs text-muted">{data.subjects.find((x) => x.id === s.subjectId)?.name ?? "General"} · {s.length} · {s.type} · {fmtDate(s.createdAt.slice(0, 10))}</p></div>
                  <div className="flex shrink-0 gap-1">
                    <button aria-label="Copy saved summary" className="rounded-lg p-1.5 text-muted hover:bg-surface-low" onClick={() => navigator.clipboard?.writeText(summaryToText(s.title, s)).then(() => toast("Copied"), () => toast("Copy unavailable", "error"))}><Copy className="h-4 w-4" /></button>
                    <button aria-label="Delete saved summary" className="rounded-lg p-1.5 text-muted hover:bg-danger-soft hover:text-danger" onClick={() => setDel(s.id)}><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">{s.summary.slice(0, 3).map((x, i) => <li key={i} className="line-clamp-3">{x}</li>)}</ul>
                <button className="mt-2 text-xs font-semibold text-primary" onClick={() => { setText(s.source); setTitle(s.title); setLength(s.length); setType(s.type); setSubjectId(s.subjectId); setResult({ summary: s.summary, keywords: s.keywords, definitions: s.definitions, revision: s.revision, stats: { sentences: 0, words: s.source.split(/\s+/).length } }); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Open</button>
              </article>
            ))}
          </div>
        )}
      </section>
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} title="Delete saved summary?" message="This summary will be permanently removed from this browser." onConfirm={() => { update((d) => ({ ...d, summaries: d.summaries.filter((x) => x.id !== del) })); toast("Summary deleted"); }} />
    </div>
  );
}
