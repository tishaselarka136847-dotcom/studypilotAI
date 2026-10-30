"use client";

import { useEffect, useMemo, useState } from "react";
import { Brain, CheckCircle2, ChevronLeft, ChevronRight, Copy, Layers, Pencil, Plus, RefreshCw, RotateCcw, Shuffle, Trash2, XCircle, Check, BookMarked, Database } from "lucide-react";
import { useStore, withLog } from "@/lib/store";
import { BUILTIN_SETS, matchScore } from "@/lib/quizBank";
import type { Flashcard, QuizAttempt, QuizQuestion, QuizSet } from "@/lib/types";
import { cn, fmtDate, uid } from "@/lib/utils";
import { AIBadge, ConfirmDialog, DemoNotice, EmptyState, Field, Modal, PageHeader, ProgressBar, Segmented } from "@/components/ui";
import QuizSetEditor, { newQ } from "@/components/QuizSetEditor";

function shuffle<T>(a: T[]): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

export default function QuizPage() {
  const [tab, setTab] = useState<"quiz" | "flashcards">("quiz");
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("tab") === "flashcards") setTab("flashcards");
  }, []);
  return (
    <div className="fade-up">
      <PageHeader title="Quiz & Flashcards" badge={<AIBadge>Sample question bank</AIBadge>} subtitle="Practise with sample questions, your own question sets and flashcards." actions={<Segmented<"quiz" | "flashcards"> label="Mode" value={tab} onChange={setTab} options={[{ value: "quiz", label: "Quiz" }, { value: "flashcards", label: "Flashcards" }]} />} />
      {tab === "quiz" ? <QuizTab /> : <FlashTab />}
    </div>
  );
}

/* ------------------------------ QUIZ ------------------------------ */
function QuizTab() {
  const { data, update, toast } = useStore();
  const allSets = useMemo(() => [...data.quizSets, ...BUILTIN_SETS], [data.quizSets]);
  const [subjectId, setSubjectId] = useState("");
  const [topic, setTopic] = useState("");
  const [setId, setSetId] = useState("");
  const [count, setCount] = useState(5);
  const [difficulty, setDifficulty] = useState<"Any" | QuizQuestion["difficulty"]>("Any");
  const [qtype, setQtype] = useState<"any" | "mcq" | "tf">("any");
  const [error, setError] = useState("");

  const [run, setRun] = useState<{ qs: QuizQuestion[]; title: string; subjectId: string; topic: string; difficulty: string } | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [idx, setIdx] = useState(0);
  const [result, setResult] = useState<QuizAttempt | null>(null);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [editor, setEditor] = useState<QuizSet | null>(null);
  const [delSet, setDelSet] = useState<QuizSet | null>(null);
  const [delAttempts, setDelAttempts] = useState(false);

  const subjectName = data.subjects.find((s) => s.id === subjectId)?.name ?? "";
  const ranked = useMemo(() => [...allSets].sort((a, b) => matchScore(b, subjectName, topic) - matchScore(a, subjectName, topic)), [allSets, subjectName, topic]);
  const chosenId = setId && allSets.some((s) => s.id === setId) ? setId : ranked[0]?.id ?? "";
  const chosen = allSets.find((s) => s.id === chosenId);
  const pool = (chosen?.questions ?? []).filter((q) => (difficulty === "Any" || q.difficulty === difficulty) && (qtype === "any" || q.type === qtype));

  const start = () => {
    if (!chosen) return setError("Choose a question set, or create your own.");
    if (pool.length === 0) return setError("No questions match that difficulty/type in this set. Try “Any”, another set, or create your own questions.");
    setError("");
    const qs = shuffle(pool).slice(0, Math.min(count, pool.length));
    setRun({ qs, title: chosen.title, subjectId, topic: topic || chosen.title, difficulty });
    setAnswers(qs.map(() => null));
    setIdx(0);
    setResult(null);
  };

  const submit = () => {
    if (!run) return;
    const correct = run.qs.reduce((a, q, i) => a + (answers[i] === q.correctIndex ? 1 : 0), 0);
    const attempt: QuizAttempt = {
      id: uid("att"),
      subjectId: run.subjectId || undefined,
      subjectName: data.subjects.find((s) => s.id === run.subjectId)?.name ?? "General",
      topic: run.title,
      difficulty: run.difficulty,
      total: run.qs.length,
      correct,
      percent: Math.round((correct / run.qs.length) * 100),
      date: new Date().toISOString(),
      questions: run.qs,
      answers,
    };
    update((d) => withLog({ ...d, quizAttempts: [...d.quizAttempts, attempt] }, "quiz", `Scored ${attempt.percent}% (${correct}/${attempt.total}) on “${run.title}”`));
    setResult(attempt);
    setRun(null);
  };

  const saveSet = (s: QuizSet) => {
    update((d) => ({ ...d, quizSets: d.quizSets.some((x) => x.id === s.id) ? d.quizSets.map((x) => (x.id === s.id ? s : x)) : [...d.quizSets, s] }));
    setEditor(null);
    toast("Question set saved");
  };

  /* ---- Taking a quiz: answer key is never rendered here ---- */
  if (run) {
    const q = run.qs[idx];
    const answered = answers.filter((a) => a !== null).length;
    return (
      <div className="mx-auto max-w-2xl">
        <div className="card p-5">
          <div className="mb-1 flex items-center justify-between text-sm"><span className="font-semibold">Question {idx + 1} of {run.qs.length}</span><span className="text-muted tnum">{answered} answered</span></div>
          <ProgressBar value={((idx + 1) / run.qs.length) * 100} color="#2563eb" />
          <p className="mt-1 text-xs text-muted">{run.title} · {q.difficulty} · {q.type === "tf" ? "True / False" : "Multiple choice"}</p>
          <h2 className="mt-5 break-words font-display text-lg font-semibold leading-snug">{q.text}</h2>
          <div className="mt-4 space-y-2.5" role="radiogroup" aria-label="Answer options">
            {q.options.map((o, i) => {
              const sel = answers[idx] === i;
              return (
                <button key={i} role="radio" aria-checked={sel} onClick={() => setAnswers((a) => a.map((x, xi) => (xi === idx ? i : x)))} className={cn("flex w-full items-center gap-3 rounded-[10px] border px-4 py-3 text-left text-sm transition-colors", sel ? "border-2 border-primary bg-primary-soft font-medium text-primary" : "border-line hover:border-muted/60 hover:bg-surface-low")}>
                  <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold", sel ? "border-primary bg-primary text-white" : "border-line text-muted")}>{q.type === "tf" ? (i === 0 ? "T" : "F") : String.fromCharCode(65 + i)}</span>
                  <span className="break-words">{o}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-6 flex items-center justify-between gap-2">
            <button className="btn-secondary" disabled={idx === 0} onClick={() => setIdx(idx - 1)}><ChevronLeft className="h-4 w-4" /> Previous</button>
            {idx < run.qs.length - 1 ? <button className="btn-primary" onClick={() => setIdx(idx + 1)}>Next <ChevronRight className="h-4 w-4" /></button> : <button className="btn-ai" onClick={() => (answered < run.qs.length ? setConfirmSubmit(true) : submit())}>Submit quiz</button>}
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-1.5" aria-label="Jump to question">
            {run.qs.map((_, i) => <button key={i} aria-label={`Go to question ${i + 1}`} onClick={() => setIdx(i)} className={cn("h-7 w-7 rounded-md text-xs font-semibold", i === idx ? "bg-primary text-white" : answers[i] !== null ? "bg-teal-soft text-teal" : "bg-surface-low text-muted")}>{i + 1}</button>)}
          </div>
          <div className="mt-4 flex justify-between border-t border-line pt-3"><button className="text-xs font-semibold text-muted hover:text-danger" onClick={() => setRun(null)}>Quit quiz</button><button className="text-xs font-semibold text-primary" onClick={() => (answered < run.qs.length ? setConfirmSubmit(true) : submit())}>Submit now</button></div>
        </div>
        <ConfirmDialog open={confirmSubmit} onClose={() => setConfirmSubmit(false)} danger={false} title="Submit with unanswered questions?" confirmLabel="Submit" message={`You have ${run.qs.length - answered} unanswered question(s). Unanswered questions are marked incorrect.`} onConfirm={submit} />
      </div>
    );
  }

  if (result) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="card p-6 text-center">
          <p className="text-sm text-muted">{result.topic}</p>
          <p className="my-2 font-display text-5xl font-bold tnum" style={{ color: result.percent >= 70 ? "#0d9488" : result.percent >= 40 ? "#d97706" : "#ba1a1a" }}>{result.percent}%</p>
          <p className="font-semibold tnum">{result.correct} correct · {result.total - result.correct} incorrect · {result.total} total</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button className="btn-primary" onClick={() => { const qs = shuffle(result.questions); setRun({ qs, title: result.topic, subjectId: result.subjectId ?? "", topic: result.topic, difficulty: result.difficulty }); setAnswers(qs.map(() => null)); setIdx(0); setResult(null); }}><RotateCcw className="h-4 w-4" /> Retry</button>
            <button className="btn-secondary" onClick={() => setResult(null)}>New quiz</button>
          </div>
        </div>
        <h2 className="h2">Review answers</h2>
        {result.questions.map((q, i) => {
          const a = result.answers[i];
          const ok = a === q.correctIndex;
          return (
            <div key={q.id + i} className={cn("card p-4", ok ? "border-teal/40" : "border-danger/40")}>
              <p className="flex items-start gap-2 font-semibold">{ok ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-teal" /> : <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />}<span className="break-words">{i + 1}. {q.text}</span></p>
              <p className="mt-2 text-sm">Your answer: <b className={ok ? "text-teal" : "text-danger"}>{a === null ? "No answer" : q.options[a]}</b></p>
              {!ok && <p className="text-sm">Correct answer: <b className="text-teal">{q.options[q.correctIndex]}</b></p>}
              <p className="mt-2 rounded-lg bg-surface-low p-2.5 text-sm text-muted">{q.explanation}</p>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="space-y-6 lg:col-span-5">
        <section className="card space-y-4 p-5">
          <DemoNotice>Questions come from a <b>local sample bank</b> or sets you write yourself. Nothing is generated by a real AI service.</DemoNotice>
          <Field label="Subject" htmlFor="qsub"><select id="qsub" className="input" value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setSetId(""); }}><option value="">General</option>{data.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
          <Field label="Topic (optional)" htmlFor="qtop" hint="Used to suggest the best matching question set."><input id="qtop" className="input" value={topic} onChange={(e) => { setTopic(e.target.value); setSetId(""); }} placeholder="e.g. trees, probability, waves" /></Field>
          <Field label="Question set" htmlFor="qset">
            <select id="qset" className="input" value={chosenId} onChange={(e) => setSetId(e.target.value)}>
              {ranked.map((s, i) => <option key={s.id} value={s.id}>{(subjectName || topic) && i === 0 && matchScore(s, subjectName, topic) > 0 ? "★ " : ""}{s.title} ({s.questions.length}){s.custom ? " · mine" : ""}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Difficulty" htmlFor="qd"><select id="qd" className="input" value={difficulty} onChange={(e) => setDifficulty(e.target.value as typeof difficulty)}><option>Any</option><option>Easy</option><option>Medium</option><option>Hard</option></select></Field>
            <Field label="Question type" htmlFor="qty"><select id="qty" className="input" value={qtype} onChange={(e) => setQtype(e.target.value as typeof qtype)}><option value="any">Any</option><option value="mcq">Multiple choice</option><option value="tf">True / False</option></select></Field>
          </div>
          <Field label={`Number of questions: ${Math.min(count, Math.max(pool.length, 1))}`} hint={`${pool.length} matching question(s) available`} htmlFor="qn"><input id="qn" type="range" min={1} max={15} className="w-full accent-primary" value={count} onChange={(e) => setCount(Number(e.target.value))} /></Field>
          {error && <p className="text-sm font-medium text-danger" role="alert">{error}</p>}
          <button className="btn-ai w-full" onClick={start}><Brain className="h-4 w-4" /> Start quiz</button>
        </section>

        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between"><h2 className="h2">Quiz history</h2>{data.quizAttempts.length > 0 && <button className="text-xs font-semibold text-danger" onClick={() => setDelAttempts(true)}>Clear</button>}</div>
          {data.quizAttempts.length === 0 ? <EmptyState icon={<Brain className="h-5 w-5" />} title="No quizzes taken yet" /> : (
            <ul className="divide-y divide-line">
              {[...data.quizAttempts].reverse().slice(0, 8).map((a) => (
                <li key={a.id}><button className="flex w-full items-center justify-between gap-2 py-2.5 text-left" onClick={() => setResult(a)}>
                  <span className="min-w-0"><span className="block truncate text-sm font-medium">{a.topic}</span><span className="text-xs text-muted">{a.subjectName} · {fmtDate(a.date.slice(0, 10))}</span></span>
                  <span className={cn("pill tnum", a.percent >= 70 ? "bg-teal-soft text-teal" : a.percent >= 40 ? "bg-warn-soft text-warn" : "bg-danger-soft text-danger")}>{a.percent}%</span>
                </button></li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card p-5 lg:col-span-7">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="h2">Question sets</h2>
          <button className="btn-primary btn-sm" onClick={() => setEditor({ id: uid("qset"), title: "", topic: "", subjectId: subjectId || undefined, custom: true, questions: [newQ()] })}><Plus className="h-3.5 w-3.5" /> New set</button>
        </div>
        <p className="mb-3 text-sm text-muted">Built-in sample sets are read-only — duplicate one to edit it. Your own sets can be edited and deleted.</p>
        <ul className="space-y-2">
          {allSets.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-2 rounded-xl border border-line p-3">
              <div className="min-w-0"><p className="break-words text-sm font-semibold">{s.title}</p><p className="text-xs text-muted">{s.questions.length} questions · {s.custom ? "Your set" : "Built-in sample"}</p></div>
              <div className="flex shrink-0 gap-1">
                {s.custom ? (
                  <>
                    <button aria-label={`Edit ${s.title}`} className="rounded-lg p-1.5 text-muted hover:bg-surface-low" onClick={() => setEditor(s)}><Pencil className="h-4 w-4" /></button>
                    <button aria-label={`Delete ${s.title}`} className="rounded-lg p-1.5 text-muted hover:bg-danger-soft hover:text-danger" onClick={() => setDelSet(s)}><Trash2 className="h-4 w-4" /></button>
                  </>
                ) : (
                  <button className="btn-secondary btn-sm" onClick={() => setEditor({ ...JSON.parse(JSON.stringify(s)), id: uid("qset"), title: `${s.title} (copy)`, custom: true })}><Copy className="h-3.5 w-3.5" /> Duplicate</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {editor && <QuizSetEditor initial={editor} subjects={data.subjects} onSave={saveSet} onClose={() => setEditor(null)} />}
      <ConfirmDialog open={!!delSet} onClose={() => setDelSet(null)} title="Delete question set?" message={<>Delete <b>{delSet?.title}</b>? Past quiz results are kept.</>} onConfirm={() => { update((d) => ({ ...d, quizSets: d.quizSets.filter((x) => x.id !== delSet?.id) })); toast("Set deleted"); }} />
      <ConfirmDialog open={delAttempts} onClose={() => setDelAttempts(false)} title="Clear quiz history?" confirmLabel="Clear history" message="All saved quiz attempts will be removed and analytics will update." onConfirm={() => update((d) => ({ ...d, quizAttempts: [] }))} />
    </div>
  );
}

/* ---------------------------- FLASHCARDS ---------------------------- */
function FlashTab() {
  const { data, update, toast } = useStore();
  const [subjectId, setSubjectId] = useState(data.subjects[0]?.id ?? "");
  const [filter, setFilter] = useState<"all" | Flashcard["status"]>("all");
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [order, setOrder] = useState<string[] | null>(null);
  const [form, setForm] = useState<{ id?: string; front: string; back: string } | null>(null);
  const [formErr, setFormErr] = useState("");
  const [del, setDel] = useState<Flashcard | null>(null);
  const [demoSet, setDemoSet] = useState(BUILTIN_SETS[0].id);

  const all = data.flashcards.filter((f) => f.subjectId === subjectId);
  const base = all.filter((f) => filter === "all" || f.status === filter);
  const cards = order ? order.map((id) => base.find((f) => f.id === id)).filter((x): x is Flashcard => !!x).concat(base.filter((f) => !order.includes(f.id))) : base;
  const safeIdx = Math.min(idx, Math.max(cards.length - 1, 0));
  const card = cards[safeIdx];

  const go = (n: number) => { setFlipped(false); setIdx(n); };
  const setStatus = (id: string, status: Flashcard["status"]) => { update((d) => ({ ...d, flashcards: d.flashcards.map((f) => (f.id === id ? { ...f, status } : f)) })); };

  const saveCard = () => {
    if (!form) return;
    if (!form.front.trim() || !form.back.trim()) return setFormErr("Both the front and back of the card need text.");
    setFormErr("");
    if (form.id) update((d) => ({ ...d, flashcards: d.flashcards.map((f) => (f.id === form.id ? { ...f, front: form.front.trim(), back: form.back.trim() } : f)) }));
    else update((d) => withLog({ ...d, flashcards: [...d.flashcards, { id: uid("fc"), subjectId, front: form.front.trim(), back: form.back.trim(), status: "new" }] }, "flashcard", "Created a flashcard"));
    setForm(null);
    toast("Card saved");
  };

  const addDemo = () => {
    const set = BUILTIN_SETS.find((s) => s.id === demoSet);
    if (!set) return;
    const existing = new Set(all.map((f) => f.front));
    const fresh = set.questions.filter((q) => !existing.has(q.text)).map((q): Flashcard => ({ id: uid("fc"), subjectId, front: q.text, back: `${q.options[q.correctIndex]} — ${q.explanation}`, status: "new" }));
    if (!fresh.length) return toast("These demo cards are already in this subject.", "info");
    update((d) => withLog({ ...d, flashcards: [...d.flashcards, ...fresh] }, "flashcard", `Added ${fresh.length} demo flashcards`));
    toast(`Added ${fresh.length} demo cards`);
  };

  if (data.subjects.length === 0)
    return <div className="card p-4"><EmptyState icon={<Layers className="h-6 w-6" />} title="Add a subject first" text="Flashcard decks belong to a subject. Create one in My Subjects, or load sample data." action={<a href="/subjects" className="btn-primary">Go to My Subjects</a>} /></div>;

  const counts = { known: all.filter((f) => f.status === "known").length, revision: all.filter((f) => f.status === "revision").length };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <section className="card space-y-4 p-5 lg:col-span-4">
        <Field label="Subject" htmlFor="fs"><select id="fs" className="input" value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setOrder(null); go(0); }}>{data.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[["Total", all.length], ["Known", counts.known], ["Revise", counts.revision]].map(([l, v]) => <div key={l} className="rounded-xl bg-surface-low p-2"><p className="font-display text-xl font-bold tnum">{v}</p><p className="text-[11px] text-muted">{l}</p></div>)}
        </div>
        <button className="btn-primary w-full" onClick={() => { setFormErr(""); setForm({ front: "", back: "" }); }}><Plus className="h-4 w-4" /> Create card</button>
        <div className="space-y-2 border-t border-line pt-4">
          <label className="label" htmlFor="ds">Demo card set</label>
          <select id="ds" className="input" value={demoSet} onChange={(e) => setDemoSet(e.target.value)}>{BUILTIN_SETS.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}</select>
          <button className="btn-secondary w-full" onClick={addDemo}><Database className="h-4 w-4" /> Add demo cards</button>
        </div>
        <div>
          <span className="label">Show</span>
          <Segmented<typeof filter> label="Card filter" value={filter} onChange={(v) => { setFilter(v); go(0); }} options={[{ value: "all", label: "All" }, { value: "new", label: "New" }, { value: "revision", label: "Revise" }, { value: "known", label: "Known" }]} />
        </div>
      </section>

      <section className="lg:col-span-8">
        {all.length === 0 ? (
          <div className="card p-4"><EmptyState icon={<BookMarked className="h-6 w-6" />} title="No flashcards for this subject" text="Create your first card, or add a demo card set from the sample topics." /></div>
        ) : cards.length === 0 ? (
          <div className="card p-4"><EmptyState icon={<Layers className="h-6 w-6" />} title="No cards match this filter" action={<button className="btn-secondary btn-sm" onClick={() => setFilter("all")}>Show all cards</button>} /></div>
        ) : (
          <div className="mx-auto max-w-xl">
            <div className="mb-2 flex items-center justify-between text-sm"><span className="font-semibold tnum">Card {safeIdx + 1} of {cards.length}</span>
              <button className="btn-ghost btn-sm" onClick={() => { setOrder(shuffle(base.map((f) => f.id))); go(0); toast("Cards shuffled", "info"); }}><Shuffle className="h-3.5 w-3.5" /> Shuffle</button></div>
            <div className="flip">
              <button className={cn("flip-inner relative block h-64 w-full text-left sm:h-72", flipped && "is-flipped")} onClick={() => setFlipped((f) => !f)} aria-label={flipped ? "Showing answer. Click to show question." : "Showing question. Click to reveal answer."}>
                <div className="flip-face card absolute inset-0 flex flex-col items-center justify-center gap-2 overflow-y-auto p-6 text-center">
                  <span className="pill-blue">Question</span>
                  <p className="break-words font-display text-lg font-semibold">{card.front}</p>
                  <span className="text-xs text-muted">Tap to flip</span>
                </div>
                <div className="flip-face flip-back card absolute inset-0 flex flex-col items-center justify-center gap-2 overflow-y-auto border-teal/40 bg-teal-soft p-6 text-center">
                  <span className="pill-teal">Answer</span>
                  <p className="break-words text-base">{card.back}</p>
                </div>
              </button>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <button className="btn-secondary" disabled={safeIdx === 0} onClick={() => go(safeIdx - 1)} aria-label="Previous card"><ChevronLeft className="h-4 w-4" /></button>
              <div className="flex flex-wrap justify-center gap-2">
                <button aria-pressed={card.status === "revision"} className={cn("btn btn-sm", card.status === "revision" ? "bg-warn text-white" : "border border-line hover:bg-surface-low")} onClick={() => setStatus(card.id, card.status === "revision" ? "new" : "revision")}><RefreshCw className="h-3.5 w-3.5" /> Revise</button>
                <button aria-pressed={card.status === "known"} className={cn("btn btn-sm", card.status === "known" ? "bg-teal text-white" : "border border-line hover:bg-surface-low")} onClick={() => { setStatus(card.id, card.status === "known" ? "new" : "known"); }}><Check className="h-3.5 w-3.5" /> Known</button>
              </div>
              <button className="btn-secondary" disabled={safeIdx >= cards.length - 1} onClick={() => go(safeIdx + 1)} aria-label="Next card"><ChevronRight className="h-4 w-4" /></button>
            </div>
            <div className="mt-3 flex justify-center gap-2">
              <button className="btn-ghost btn-sm" onClick={() => { setFormErr(""); setForm({ id: card.id, front: card.front, back: card.back }); }}><Pencil className="h-3.5 w-3.5" /> Edit</button>
              <button className="btn-ghost btn-sm text-danger" onClick={() => setDel(card)}><Trash2 className="h-3.5 w-3.5" /> Delete</button>
            </div>
          </div>
        )}
      </section>

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? "Edit flashcard" : "New flashcard"}>
        {form && (
          <div className="space-y-4">
            <Field label="Front (question)" htmlFor="ff"><textarea id="ff" className="input min-h-[70px]" value={form.front} onChange={(e) => setForm({ ...form, front: e.target.value })} /></Field>
            <Field label="Back (answer)" htmlFor="fb" error={formErr}><textarea id="fb" className="input min-h-[90px]" value={form.back} onChange={(e) => setForm({ ...form, back: e.target.value })} /></Field>
            <div className="flex justify-end gap-2"><button className="btn-secondary" onClick={() => setForm(null)}>Cancel</button><button className="btn-primary" onClick={saveCard}>Save card</button></div>
          </div>
        )}
      </Modal>
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} title="Delete flashcard?" message="This card will be permanently removed." onConfirm={() => { update((d) => ({ ...d, flashcards: d.flashcards.filter((f) => f.id !== del?.id) })); go(Math.max(0, safeIdx - 1)); toast("Card deleted"); }} />
    </div>
  );
}
