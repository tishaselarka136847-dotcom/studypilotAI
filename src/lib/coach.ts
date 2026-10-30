import type { AppData, Subject } from "./types";
import { BUILTIN_SETS, matchScore } from "./quizBank";
import { daysBetween, fmtDuration, todayISO } from "./utils";

/** Template-based "coach". Every answer is produced locally from fixed templates + the student's saved data. */

const CONCEPTS: { keys: string[]; title: string; text: string }[] = [
  { keys: ["binary search"], title: "Binary search", text: "Binary search finds an item in a **sorted** list by repeatedly comparing with the middle element and discarding the half that cannot contain it.\n- Each step halves the range → O(log n)\n- Requires sorted data\n- Watch off-by-one errors with low/high/mid" },
  { keys: ["recursion", "recursive"], title: "Recursion", text: "Recursion solves a problem by calling the same function on a smaller version of it.\n- Needs a **base case** that stops the calls\n- Each call uses stack space (watch depth)\n- Tip: write the base case first, then trust the recursive step" },
  { keys: ["big o", "big-o", "complexity", "time complexity"], title: "Big-O notation", text: "Big-O describes how running time grows as input size n grows, ignoring constants.\n- O(1) constant · O(log n) halving · O(n) one pass · O(n log n) good sorting · O(n²) nested loops\n- Count the dominant loop; drop constants and lower-order terms" },
  { keys: ["linked list"], title: "Linked list", text: "A linked list stores items in nodes, each pointing to the next.\n- O(1) insert/delete at a known position, O(n) to reach index k\n- No contiguous memory needed\n- Draw the pointers on paper before coding" },
  { keys: ["stack", "queue"], title: "Stack vs queue", text: "- **Stack**: Last-In-First-Out (undo history, DFS)\n- **Queue**: First-In-First-Out (task scheduling, BFS)\nBoth give O(1) push/pop or enqueue/dequeue when implemented well." },
  { keys: ["tree", "bst"], title: "Binary search tree", text: "A BST keeps smaller keys in the left subtree and larger keys in the right.\n- In-order traversal gives sorted order\n- Search/insert are O(h), where h is the height (O(log n) if balanced)\n- Skewed trees degrade to O(n)" },
  { keys: ["dynamic programming", "dp"], title: "Dynamic programming", text: "DP breaks a problem into overlapping subproblems and stores results so each is solved once.\n1. Define the state\n2. Write the recurrence\n3. Set base cases\n4. Choose memoisation (top-down) or tabulation (bottom-up)" },
  { keys: ["interference", "diffraction", "wave"], title: "Wave interference", text: "When waves overlap their displacements add.\n- In phase (path difference nλ) → constructive, bigger amplitude\n- Out of phase ((n+½)λ) → destructive, smaller amplitude\nDiffraction is bending around edges/slits, strongest when the opening is similar to λ." },
  { keys: ["probability"], title: "Probability", text: "Probability = favourable outcomes ÷ total equally likely outcomes.\n- Independent events: P(A and B) = P(A)·P(B)\n- Either event: P(A or B) = P(A)+P(B)−P(A and B)\nList the sample space first to avoid missing cases." },
  { keys: ["overfitting", "machine learning"], title: "Overfitting", text: "A model overfits when it memorises training data noise and performs worse on new data.\n- Signs: low training error, high validation error\n- Fixes: more data, simpler model, regularisation, early stopping" },
  { keys: ["set", "subset", "logic"], title: "Sets & logic", text: "- A set with n elements has 2ⁿ subsets\n- p → q is false only when p is true and q is false\n- De Morgan: ¬(p ∧ q) ≡ ¬p ∨ ¬q\nTruth tables are the safest way to check an equivalence." },
];

function findSubject(input: string, subjects: Subject[]): Subject | undefined {
  const l = input.toLowerCase();
  return subjects.find((s) => l.includes(s.name.toLowerCase()) || s.name.toLowerCase().split(/\s+/).some((w) => w.length > 4 && l.includes(w)));
}

function nextTopics(data: AppData, limit = 3) {
  const t = todayISO();
  const rows: { s: Subject; title: string; score: number }[] = [];
  for (const s of data.subjects) {
    const left = s.examDate ? daysBetween(t, s.examDate) : 60;
    if (left < 0) continue;
    for (const tp of s.topics.filter((x) => !x.completed))
      rows.push({ s, title: tp.title, score: 1 / (left + 1) + (6 - s.confidence) * 0.08 + (s.priority === "High" ? 0.1 : 0) });
  }
  return rows.sort((a, b) => b.score - a.score).slice(0, limit);
}

export function coachReply(input: string, data: AppData): string {
  const l = input.toLowerCase();
  const t = todayISO();

  if (/next topic|what should i (study|learn)|suggest my next|study next|what next/.test(l)) {
    const rows = nextTopics(data);
    if (!data.subjects.length) return "You haven't added any subjects yet. Add a subject and a few syllabus topics in **My Subjects** (or load the sample data) and I can suggest what to study next.";
    if (!rows.length) return "All the topics you've added are marked complete. Add more topics, or use **Quiz & Flashcards** to test yourself.";
    return "Based on your exam dates, confidence and priorities, here's what I'd do next:\n" +
      rows.map((r, i) => `${i + 1}. **${r.title}** (${r.s.name}${r.s.examDate ? `, exam in ${daysBetween(t, r.s.examDate)} days` : ""})`).join("\n") +
      "\nThis ranking comes from a simple urgency × confidence formula in your browser.";
  }

  if (/checklist|revision list|revise/.test(l)) {
    const s = findSubject(input, data.subjects) ?? [...data.subjects].filter((x) => x.examDate && daysBetween(t, x.examDate) >= 0).sort((a, b) => a.examDate.localeCompare(b.examDate))[0] ?? data.subjects[0];
    if (!s) return "Add a subject first, then I can build a revision checklist from its topics.";
    const pending = s.topics.filter((x) => !x.completed);
    return `Revision checklist for **${s.name}**:\n` +
      (pending.length ? pending.map((x) => `- ☐ Review “${x.title}” and write 3 key points`).join("\n") : "- ☑ All topics are marked complete") +
      "\n- ☐ Do 10 practice questions on your weakest topic\n- ☐ Make flashcards for formulas/definitions\n- ☐ Re-read your own notes once, then self-test from memory";
  }

  if (/today|organi[sz]e|plan my day|schedule/.test(l)) {
    const todays = (data.plan?.sessions ?? []).filter((x) => x.date === t).sort((a, b) => a.start.localeCompare(b.start));
    if (todays.length) {
      return "Here's today from your saved timetable:\n" + todays.map((x) => `- ${x.start}–${x.end} · ${x.topicTitle} ${x.completed ? "✅" : ""}`).join("\n") +
        "\nStart the first unfinished one in **Focus Timer**.";
    }
    const rows = nextTopics(data, 2);
    const block = data.prefs.sessionMin;
    if (!rows.length) return "You have no saved sessions or pending topics for today. Add topics in **My Subjects** and generate a plan in **Study Planner**.";
    return `You have no timetable entries for today. A simple split of your ${data.prefs.dailyGoalHours}h goal:\n` +
      rows.map((r, i) => `- Block ${i + 1}: ${fmtDuration(block)} on **${r.title}** (${r.s.name})`).join("\n") +
      `\n- ${fmtDuration(data.prefs.breakMin)} break between blocks\n- Finish with a 15-minute recap and a few flashcards`;
  }

  if (/practice question|sample question|quiz me|give me a question/.test(l)) {
    const s = findSubject(input, data.subjects) ?? nextTopics(data, 1)[0]?.s;
    const sets = [...BUILTIN_SETS, ...data.quizSets];
    const set = (s ? [...sets].sort((a, b) => matchScore(b, s.name, "") - matchScore(a, s.name, ""))[0] : sets[0]) ?? BUILTIN_SETS[0];
    const q = set.questions[Math.floor(Math.random() * set.questions.length)];
    return `Sample practice question (from the local sample bank — “${set.title}”):\n**${q.text}**\n` +
      q.options.map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`).join("\n") +
      `\n\nTry it first, then check: **${String.fromCharCode(65 + q.correctIndex)}** — ${q.explanation}`;
  }

  const concept = CONCEPTS.find((c) => c.keys.some((k) => new RegExp(`\\b${k}\\b`).test(l)));
  if (concept) return `**${concept.title}** (sample explanation)\n${concept.text}`;

  if (/explain|difficult|concept|understand|what is|how does/.test(l)) {
    const sub = findSubject(input, data.subjects);
    const hard = sub ? sub.topics.find((x) => !x.completed) : nextTopics(data, 1)[0];
    const name = hard ? ("title" in hard ? hard.title : "") : "";
    return "I only have a limited set of built-in sample explanations (e.g. binary search, recursion, Big-O, linked lists, trees, dynamic programming, interference, probability, overfitting).\n" +
      (name ? `A good way to learn **${name}** meanwhile: \n` : "A general method for any difficult concept:\n") +
      "1. Write a one-sentence definition\n2. Find one concrete example\n3. Explain it aloud as if teaching a friend\n4. Test it with a practice question\nTry asking about one of the concepts above.";
  }

  return "I'm a simple demo coach, so I understand a few kinds of requests. Try:\n- “Suggest my next topic”\n- “Make a revision checklist”\n- “Help me organize today's study”\n- “Give me a sample practice question”\n- “Explain binary search” (or recursion, Big-O, trees, probability…)";
}
