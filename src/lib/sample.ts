import type { AppData, Flashcard, Subject } from "./types";
import { addDays, todayISO, uid } from "./utils";

function subj(
  name: string,
  color: string,
  priority: Subject["priority"],
  confidence: Subject["confidence"],
  examIn: number,
  topics: [string, number, boolean][],
  notes: string
): Subject {
  const t = todayISO();
  return {
    id: uid("sub"),
    name,
    color,
    priority,
    confidence,
    examDate: addDays(t, examIn),
    notes,
    createdAt: new Date().toISOString(),
    topics: topics.map(([title, estimatedMinutes, completed]) => ({
      id: uid("top"),
      title,
      estimatedMinutes,
      completed,
      completedAt: completed ? new Date().toISOString() : undefined,
    })),
  };
}

/** Demonstration data: subjects/topics/flashcards only. It deliberately contains NO fake study history, quiz scores or streaks. */
export function sampleData(base: AppData): AppData {
  const ds = subj("Data Structures & Algorithms", "#7c3aed", "Medium", 3, 12, [
    ["Arrays & Linked Lists", 60, true],
    ["Stacks & Queues", 45, true],
    ["Binary Trees & BST", 75, false],
    ["Graph Traversal (BFS/DFS)", 75, false],
    ["Sorting Algorithms", 60, false],
    ["Dynamic Programming", 90, false],
  ], "Focus on complexity analysis and tree traversals.");
  const ph = subj("Engineering Physics", "#dc2626", "High", 2, 6, [
    ["Wave Equations", 60, true],
    ["Optics & Diffraction", 60, false],
    ["Quantum Harmonic Oscillator", 90, false],
    ["Maxwell's Laws", 75, false],
  ], "Bring calculator. Revise derivations.");
  const dm = subj("Discrete Mathematics", "#0d9488", "Low", 4, 19, [
    ["Sets & Relations", 45, true],
    ["Propositional Logic", 45, true],
    ["Counting & Combinatorics", 60, false],
    ["Graph Theory Basics", 60, false],
  ], "");
  const card = (subjectId: string, front: string, back: string): Flashcard => ({ id: uid("fc"), subjectId, front, back, status: "new" });
  const flashcards = [
    card(ds.id, "What is the time complexity of binary search?", "O(log n) — the search range is halved each step on a sorted array."),
    card(ds.id, "Difference between stack and queue?", "Stack is LIFO (last in, first out); queue is FIFO (first in, first out)."),
    card(ds.id, "In-order traversal of a BST gives…", "Keys in ascending sorted order."),
    card(ph.id, "Relation between v, f and λ?", "v = f × λ"),
    card(ph.id, "Condition for constructive interference?", "Path difference equals an integer multiple of the wavelength (nλ)."),
    card(dm.id, "Number of subsets of an n-element set?", "2ⁿ"),
  ];
  return {
    ...base,
    subjects: [ds, ph, dm],
    flashcards,
    usingSampleData: true,
    activity: [
      { id: uid("act"), text: "Loaded sample demonstration data", kind: "system", at: new Date().toISOString() },
      ...base.activity,
    ],
  };
}
