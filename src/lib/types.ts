export type Priority = "High" | "Medium" | "Low";

export interface Topic {
  id: string;
  title: string;
  completed: boolean;
  completedAt?: string; // ISO timestamp
  estimatedMinutes: number;
}

export interface Subject {
  id: string;
  name: string;
  color: string; // hex
  priority: Priority;
  confidence: 1 | 2 | 3 | 4 | 5;
  examDate: string; // YYYY-MM-DD or ""
  notes: string;
  topics: Topic[];
  createdAt: string;
}

export type Activity = "Learn" | "Practice" | "Revision";

export interface StudySession {
  id: string;
  subjectId: string;
  topicId?: string;
  topicTitle: string;
  activity: Activity;
  date: string; // YYYY-MM-DD
  start: string; // HH:MM
  end: string; // HH:MM
  durationMin: number;
  priority: Priority;
  completed: boolean;
  completedAt?: string;
  completedVia?: "timer" | "manual";
}

export interface PlanSettings {
  subjectIds: string[];
  studyDays: number[]; // 0 = Sunday
  dailyHours: number;
  sessionMin: number;
  breakMin: number;
  revision: boolean;
  startTime: string; // HH:MM
  startDate: string; // YYYY-MM-DD
}

export interface UnscheduledItem {
  subjectId: string;
  topicId?: string;
  topicTitle: string;
  activity: Activity;
  minutesLeft: number;
  reason: string;
}

export interface StudyPlan {
  id: string;
  createdAt: string;
  customized: boolean;
  settings: PlanSettings;
  sessions: StudySession[];
  unscheduled: UnscheduledItem[];
  warnings: string[];
}

export type SummaryLength = "Short" | "Medium" | "Detailed";
export type SummaryType = "Simple Explanation" | "Exam Revision" | "Key Points";

export interface SavedSummary {
  id: string;
  subjectId: string;
  title: string;
  length: SummaryLength;
  type: SummaryType;
  source: string;
  summary: string[];
  keywords: string[];
  definitions: string[];
  revision: string[];
  createdAt: string;
}

export interface QuizQuestion {
  id: string;
  type: "mcq" | "tf";
  text: string;
  options: string[]; // mcq: 2-6 options; tf: ["True","False"]
  correctIndex: number;
  explanation: string;
  difficulty: "Easy" | "Medium" | "Hard";
}

export interface QuizSet {
  id: string;
  title: string;
  subjectId?: string;
  topic: string;
  custom: boolean;
  questions: QuizQuestion[];
}

export interface QuizAttempt {
  id: string;
  subjectId?: string;
  subjectName: string;
  topic: string;
  difficulty: string;
  total: number;
  correct: number;
  percent: number;
  date: string; // ISO timestamp
  questions: QuizQuestion[];
  answers: (number | null)[];
}

export interface Flashcard {
  id: string;
  subjectId: string;
  front: string;
  back: string;
  status: "new" | "known" | "revision";
}

export interface FocusSession {
  id: string;
  label: string;
  subjectId?: string;
  planSessionId?: string;
  plannedSec: number;
  activeSec: number;
  completedAt: string; // ISO timestamp
}

export interface Preferences {
  name: string;
  dailyGoalHours: number;
  sessionMin: number;
  breakMin: number;
  studyDays: number[];
  theme: "light" | "dark" | "system";
  startTime: string;
  revision: boolean;
}

export interface ActivityLog {
  id: string;
  text: string;
  kind: "subject" | "topic" | "plan" | "summary" | "quiz" | "flashcard" | "focus" | "system";
  at: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "coach";
  text: string;
}

export interface AppData {
  version: 1;
  subjects: Subject[];
  plan: StudyPlan | null;
  summaries: SavedSummary[];
  quizSets: QuizSet[];
  quizAttempts: QuizAttempt[];
  flashcards: Flashcard[];
  focusSessions: FocusSession[];
  prefs: Preferences;
  activity: ActivityLog[];
  usingSampleData: boolean;
}
