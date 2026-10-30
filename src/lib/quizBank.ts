import type { QuizQuestion, QuizSet } from "./types";

type Diff = QuizQuestion["difficulty"];
let n = 0;
const mcq = (text: string, options: string[], correctIndex: number, explanation: string, difficulty: Diff = "Medium"): QuizQuestion => ({
  id: `bq${++n}`,
  type: "mcq",
  text,
  options,
  correctIndex,
  explanation,
  difficulty,
});
const tf = (text: string, answer: boolean, explanation: string, difficulty: Diff = "Easy"): QuizQuestion => ({
  id: `bq${++n}`,
  type: "tf",
  text,
  options: ["True", "False"],
  correctIndex: answer ? 0 : 1,
  explanation,
  difficulty,
});

/** Built-in demonstration question bank (read-only). Students can duplicate any set to edit it. */
export const BUILTIN_SETS: QuizSet[] = [
  {
    id: "bank_ds_basics",
    title: "Data Structures: Arrays, Lists & Complexity",
    topic: "data structures arrays linked lists complexity big-o",
    custom: false,
    questions: [
      mcq("What is the time complexity of accessing an element by index in an array?", ["O(1)", "O(log n)", "O(n)", "O(n²)"], 0, "Arrays store elements contiguously, so the address of any index is computed directly in constant time.", "Easy"),
      mcq("Which data structure gives O(1) insertion at the head without shifting elements?", ["Array", "Singly linked list", "Sorted array", "Binary heap"], 1, "A linked list only needs to rewire the head pointer; an array must shift every element.", "Easy"),
      tf("Binary search works correctly on an unsorted array.", false, "Binary search relies on the data being sorted so that half of the range can be discarded each step.", "Easy"),
      mcq("What is the worst-case time complexity of binary search on n sorted items?", ["O(1)", "O(log n)", "O(n)", "O(n log n)"], 1, "The search range halves every step, giving about log₂(n) steps.", "Medium"),
      mcq("Which notation describes an upper bound on an algorithm's growth rate?", ["Big-Omega", "Big-Theta", "Big-O", "Little-o"], 2, "Big-O gives an asymptotic upper bound; Omega is a lower bound and Theta is a tight bound.", "Medium"),
      mcq("A nested loop where both loops run n times has which complexity?", ["O(n)", "O(2n)", "O(n²)", "O(log n)"], 2, "n iterations of an inner loop that itself runs n times performs n × n operations.", "Medium"),
      tf("A stack follows First-In-First-Out ordering.", false, "A stack is Last-In-First-Out (LIFO). A queue is First-In-First-Out.", "Easy"),
      mcq("Which operation is O(n) for a singly linked list but O(1) for an array?", ["Insert at head", "Access element at index k", "Delete head", "Traverse all"], 1, "Reaching index k in a linked list requires following k pointers.", "Hard"),
    ],
  },
  {
    id: "bank_ds_trees",
    title: "Data Structures: Trees & Graphs",
    topic: "trees graphs binary search tree traversal bst",
    custom: false,
    questions: [
      mcq("In-order traversal of a binary search tree visits nodes in which order?", ["Random order", "Ascending sorted order", "Descending sorted order", "Level by level"], 1, "In-order visits left subtree, node, then right subtree, which yields sorted keys in a BST.", "Easy"),
      mcq("Which traversal uses a queue?", ["Pre-order", "In-order", "Post-order", "Level-order (BFS)"], 3, "Breadth-first (level-order) traversal processes nodes in the order discovered, which needs a FIFO queue.", "Medium"),
      tf("A balanced BST guarantees O(log n) search time.", true, "Balancing keeps the height proportional to log n, so search follows at most that many edges.", "Medium"),
      mcq("What is the maximum number of children of a node in a binary tree?", ["1", "2", "3", "Unlimited"], 1, "By definition each node in a binary tree has at most two children.", "Easy"),
      mcq("Which structure is typically used to implement depth-first search iteratively?", ["Queue", "Stack", "Heap", "Hash table"], 1, "A stack (or recursion, which uses the call stack) tracks the path to backtrack along.", "Medium"),
      tf("Every tree is a connected acyclic graph.", true, "A tree is exactly a connected graph with no cycles.", "Medium"),
    ],
  },
  {
    id: "bank_physics_waves",
    title: "Engineering Physics: Waves & Optics",
    topic: "physics waves optics interference diffraction quantum",
    custom: false,
    questions: [
      mcq("What is the relationship between wave speed v, frequency f and wavelength λ?", ["v = f / λ", "v = f λ", "v = λ / f", "v = f + λ"], 1, "Wave speed equals frequency multiplied by wavelength.", "Easy"),
      mcq("Constructive interference occurs when two waves meet with a phase difference of:", ["π", "π/2", "0 (or 2π)", "3π/2"], 2, "Waves in phase add their amplitudes, producing a larger resultant amplitude.", "Medium"),
      tf("Diffraction is more noticeable when the slit width is comparable to the wavelength.", true, "Significant bending occurs when the aperture size is of the same order as the wavelength.", "Medium"),
      mcq("In Young's double-slit experiment, bright fringes appear where the path difference is:", ["An odd multiple of λ/2", "An integer multiple of λ", "Zero only", "Always λ/4"], 1, "Path differences of nλ give constructive interference and a bright fringe.", "Hard"),
      tf("Light is a transverse wave.", true, "Electromagnetic waves oscillate perpendicular to their direction of travel, which is why light can be polarised.", "Easy"),
      mcq("Which phenomenon demonstrates the wave nature of electrons?", ["Photoelectric effect", "Electron diffraction", "Radioactivity", "Pair production"], 1, "Electron diffraction patterns, as in the Davisson–Germer experiment, show wave behaviour.", "Hard"),
    ],
  },
  {
    id: "bank_discrete_math",
    title: "Discrete Mathematics: Sets, Logic & Counting",
    topic: "discrete mathematics sets logic relations counting probability combinatorics",
    custom: false,
    questions: [
      mcq("How many subsets does a set with 4 elements have?", ["8", "12", "16", "24"], 2, "A set with n elements has 2ⁿ subsets, so 2⁴ = 16.", "Easy"),
      mcq("The statement p → q is false only when:", ["p false, q true", "p true, q false", "both false", "both true"], 1, "An implication fails only when the premise is true and the conclusion is false.", "Medium"),
      tf("The number of ways to choose 2 items from 5 is 10.", true, "C(5,2) = 5! / (2! 3!) = 10.", "Easy"),
      mcq("A relation that is reflexive, symmetric and transitive is called:", ["Partial order", "Equivalence relation", "Function", "Bijection"], 1, "Equivalence relations partition a set into equivalence classes.", "Medium"),
      mcq("How many ways can 4 distinct books be arranged on a shelf?", ["4", "16", "24", "64"], 2, "4! = 4 × 3 × 2 × 1 = 24 permutations.", "Easy"),
      tf("De Morgan's law states ¬(p ∧ q) ≡ ¬p ∨ ¬q.", true, "Negating a conjunction gives the disjunction of the negations.", "Medium"),
    ],
  },
  {
    id: "bank_ml_basics",
    title: "Machine Learning & Prompt Engineering Basics",
    topic: "machine learning prompt engineering ai neural overfitting",
    custom: false,
    questions: [
      mcq("What does overfitting mean?", ["The model is too simple", "The model memorises training data and generalises poorly", "Training takes too long", "The data set is too large"], 1, "An overfitted model performs well on training data but poorly on unseen data.", "Easy"),
      tf("A validation set is used to evaluate a model on data it was trained on.", false, "Validation data is held out from training to estimate generalisation.", "Easy"),
      mcq("Few-shot prompting means:", ["Giving the model a few examples inside the prompt", "Training the model for a few epochs", "Using a short prompt only", "Sampling a few tokens"], 0, "A few worked examples in the prompt steer the model toward the desired output format.", "Medium"),
      mcq("Gradient descent updates parameters by moving:", ["Along the gradient", "Opposite to the gradient of the loss", "Randomly", "Towards larger loss"], 1, "Parameters move in the direction that decreases the loss.", "Medium"),
      tf("Increasing the learning rate always speeds up convergence safely.", false, "A rate that is too high can overshoot minima or diverge.", "Medium"),
    ],
  },
];

export function matchScore(set: QuizSet, subjectName: string, topic: string): number {
  const hay = `${set.title} ${set.topic}`.toLowerCase();
  const words = `${subjectName} ${topic}`
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2 && !["and", "the", "for"].includes(w));
  return words.reduce((a, w) => a + (hay.includes(w) ? 1 : 0), 0);
}

export function validateQuestion(q: QuizQuestion): string | null {
  if (!q.text.trim()) return "Question text is required.";
  if (q.type === "tf") {
    if (q.correctIndex !== 0 && q.correctIndex !== 1) return "True/False needs a correct answer.";
    return null;
  }
  const opts = q.options.map((o) => o.trim());
  if (opts.length < 2) return "Multiple-choice needs at least 2 options.";
  if (opts.some((o) => !o)) return "All options must have text.";
  if (new Set(opts.map((o) => o.toLowerCase())).size !== opts.length) return "Options must be different from each other.";
  if (!Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex >= opts.length)
    return "Select exactly one correct option.";
  return null;
}
