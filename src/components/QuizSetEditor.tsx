"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { QuizQuestion, QuizSet } from "@/lib/types";
import { validateQuestion } from "@/lib/quizBank";
import { uid } from "@/lib/utils";
import { Field, Modal } from "./ui";

const newQ = (): QuizQuestion => ({ id: uid("q"), type: "mcq", text: "", options: ["", "", "", ""], correctIndex: 0, explanation: "", difficulty: "Medium" });

export default function QuizSetEditor({ initial, subjects, onSave, onClose }: { initial: QuizSet; subjects: { id: string; name: string }[]; onSave: (s: QuizSet) => void; onClose: () => void }) {
  const [set, setSet] = useState<QuizSet>(() => JSON.parse(JSON.stringify(initial)));
  const [errors, setErrors] = useState<string[]>([]);

  const setQ = (i: number, patch: Partial<QuizQuestion>) => setSet((s) => ({ ...s, questions: s.questions.map((q, idx) => (idx === i ? { ...q, ...patch } : q)) }));

  const changeType = (i: number, type: "mcq" | "tf") =>
    setQ(i, type === "tf" ? { type, options: ["True", "False"], correctIndex: 0 } : { type, options: ["", "", "", ""], correctIndex: 0 });

  const save = () => {
    const errs: string[] = [];
    if (!set.title.trim()) errs.push("Give the question set a title.");
    if (set.questions.length === 0) errs.push("Add at least one question.");
    set.questions.forEach((q, i) => {
      const e = validateQuestion(q);
      if (e) errs.push(`Question ${i + 1}: ${e}`);
    });
    setErrors(errs);
    if (errs.length) return;
    onSave({ ...set, title: set.title.trim(), topic: set.topic.trim() || set.title.trim(), custom: true, questions: set.questions.map((q) => ({ ...q, text: q.text.trim(), options: q.options.map((o) => o.trim()), explanation: q.explanation.trim() || "No explanation provided." })) });
  };

  return (
    <Modal open onClose={onClose} title={initial.questions.length ? "Edit question set" : "New question set"} wide>
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Set title" htmlFor="qt"><input id="qt" className="input" value={set.title} onChange={(e) => setSet({ ...set, title: e.target.value })} /></Field>
          <Field label="Subject" htmlFor="qs">
            <select id="qs" className="input" value={set.subjectId ?? ""} onChange={(e) => setSet({ ...set, subjectId: e.target.value || undefined })}>
              <option value="">General</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Topic keywords" htmlFor="qk" hint="Used to match this set when you pick a subject/topic for a quiz."><input id="qk" className="input" value={set.topic} onChange={(e) => setSet({ ...set, topic: e.target.value })} /></Field>

        <div className="space-y-4">
          {set.questions.map((q, i) => (
            <fieldset key={q.id} className="rounded-xl border border-line p-3">
              <legend className="px-1 text-xs font-semibold text-muted">Question {i + 1}</legend>
              <div className="space-y-3">
                <textarea aria-label={`Question ${i + 1} text`} className="input min-h-[60px]" placeholder="Question text" value={q.text} onChange={(e) => setQ(i, { text: e.target.value })} />
                <div className="grid grid-cols-2 gap-3">
                  <select aria-label="Question type" className="input" value={q.type} onChange={(e) => changeType(i, e.target.value as "mcq" | "tf")}><option value="mcq">Multiple choice</option><option value="tf">True / False</option></select>
                  <select aria-label="Difficulty" className="input" value={q.difficulty} onChange={(e) => setQ(i, { difficulty: e.target.value as QuizQuestion["difficulty"] })}><option>Easy</option><option>Medium</option><option>Hard</option></select>
                </div>
                <div className="space-y-2" role="radiogroup" aria-label="Correct answer">
                  {q.options.map((o, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <input type="radio" name={`c-${q.id}`} aria-label={`Mark option ${oi + 1} as correct`} className="h-4 w-4 accent-teal" checked={q.correctIndex === oi} onChange={() => setQ(i, { correctIndex: oi })} />
                      {q.type === "tf" ? <span className="text-sm">{o}</span> : <input aria-label={`Option ${oi + 1}`} className="input !h-9" placeholder={`Option ${oi + 1}`} value={o} onChange={(e) => setQ(i, { options: q.options.map((x, xi) => (xi === oi ? e.target.value : x)) })} />}
                      {q.type === "mcq" && q.options.length > 2 && (
                        <button aria-label="Remove option" className="rounded p-1 text-muted hover:text-danger" onClick={() => setQ(i, { options: q.options.filter((_, xi) => xi !== oi), correctIndex: q.correctIndex === oi ? 0 : q.correctIndex > oi ? q.correctIndex - 1 : q.correctIndex })}><Trash2 className="h-4 w-4" /></button>
                      )}
                    </div>
                  ))}
                  {q.type === "mcq" && q.options.length < 6 && <button className="text-xs font-semibold text-primary" onClick={() => setQ(i, { options: [...q.options, ""] })}>+ Add option</button>}
                  <p className="text-xs text-muted">Select the radio button next to the single correct answer.</p>
                </div>
                <input aria-label="Explanation" className="input" placeholder="Explanation shown after submitting" value={q.explanation} onChange={(e) => setQ(i, { explanation: e.target.value })} />
                <button className="btn-ghost btn-sm text-danger" onClick={() => setSet({ ...set, questions: set.questions.filter((_, idx) => idx !== i) })}><Trash2 className="h-3.5 w-3.5" /> Remove question</button>
              </div>
            </fieldset>
          ))}
        </div>
        <button className="btn-secondary w-full" onClick={() => setSet({ ...set, questions: [...set.questions, newQ()] })}><Plus className="h-4 w-4" /> Add question</button>

        {errors.length > 0 && <ul className="list-disc space-y-0.5 rounded-lg bg-danger-soft p-3 pl-6 text-sm text-danger" role="alert">{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>}
        <div className="flex justify-end gap-2"><button className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={save}>Save set</button></div>
      </div>
    </Modal>
  );
}
export { newQ };
