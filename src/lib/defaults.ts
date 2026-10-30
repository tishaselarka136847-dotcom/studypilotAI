import type { AppData, Preferences } from "./types";

export const DEFAULT_PREFS: Preferences = {
  name: "",
  dailyGoalHours: 3,
  sessionMin: 45,
  breakMin: 10,
  studyDays: [1, 2, 3, 4, 5, 6],
  theme: "light",
  startTime: "09:00",
  revision: true,
};

export function emptyData(): AppData {
  return {
    version: 1,
    subjects: [],
    plan: null,
    summaries: [],
    quizSets: [],
    quizAttempts: [],
    flashcards: [],
    focusSessions: [],
    prefs: { ...DEFAULT_PREFS },
    activity: [],
    usingSampleData: false,
  };
}
