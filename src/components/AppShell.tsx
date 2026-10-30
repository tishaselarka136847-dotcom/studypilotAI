"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import {
  LayoutGrid, CalendarCheck, BookOpen, Sparkles, Brain, Bot, TrendingUp, Settings, Timer, Search, Plus, Moon, Sun, Flame, Clock, MoreHorizontal, X, Rocket, AlertTriangle,
} from "lucide-react";
import { StoreProvider, useStore } from "@/lib/store";
import { TimerProvider, useTimer } from "@/lib/timer";
import { nextExam, streak } from "@/lib/stats";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutGrid },
  { href: "/planner", label: "Study Planner", icon: CalendarCheck },
  { href: "/subjects", label: "My Subjects", icon: BookOpen },
  { href: "/notes", label: "Notes Summarizer", icon: Sparkles },
  { href: "/quiz", label: "Quiz & Flashcards", icon: Brain },
  { href: "/coach", label: "AI Study Coach", icon: Bot },
  { href: "/focus", label: "Focus Timer", icon: Timer },
  { href: "/analytics", label: "Progress & Analytics", icon: TrendingUp },
  { href: "/settings", label: "Settings", icon: Settings },
];
const BOTTOM = ["/", "/planner", "/subjects", "/focus"];

function isActive(path: string, href: string) {
  return href === "/" ? path === "/" : path.startsWith(href);
}

function Sidebar() {
  const path = usePathname();
  const { data } = useStore();
  const st = streak(data);
  const name = data.prefs.name || "Student";
  return (
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-16 flex-col justify-between overflow-y-auto border-r border-line bg-card md:flex lg:w-64">
      <div>
        <div className="flex h-16 items-center gap-2 px-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-violet text-white">
            <Rocket className="h-4 w-4" />
          </div>
          <span className="hidden font-display text-lg font-bold lg:block">StudyPilot AI</span>
        </div>
        <nav className="mt-2 flex flex-col gap-1 px-2" aria-label="Main">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} title={label} aria-current={isActive(path, href) ? "page" : undefined} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors", isActive(path, href) ? "bg-primary text-white shadow-card" : "text-muted hover:bg-surface-low hover:text-ink")}>
              <Icon className="h-5 w-5 shrink-0" />
              <span className="hidden lg:block">{label}</span>
            </Link>
          ))}
        </nav>
      </div>
      <div className="flex flex-col gap-2 p-2">
        <div className="flex items-center gap-2 rounded-xl bg-surface-low p-2">
          <Flame className={cn("h-5 w-5 shrink-0", st > 0 ? "text-warn" : "text-muted")} />
          <div className="hidden min-w-0 lg:block">
            <p className="truncate text-xs font-semibold">{st > 0 ? `${st}-Day Streak` : "No streak yet"}</p>
            <p className="truncate text-[11px] text-muted">{st > 0 ? "Keep it going!" : "Complete a focus session"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-line p-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-soft text-sm font-bold text-violet">{name.charAt(0).toUpperCase()}</div>
          <div className="hidden min-w-0 lg:block">
            <p className="truncate text-sm font-semibold">{name}</p>
            <p className="truncate text-xs text-muted">Local profile</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function GlobalSearch() {
  const { data } = useStore();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (s.length < 2) return [];
    const out: { label: string; sub: string; href: string }[] = [];
    for (const sub of data.subjects) {
      if (sub.name.toLowerCase().includes(s)) out.push({ label: sub.name, sub: "Subject", href: `/subjects?open=${sub.id}` });
      for (const t of sub.topics) if (t.title.toLowerCase().includes(s)) out.push({ label: t.title, sub: `Topic · ${sub.name}`, href: `/subjects?open=${sub.id}` });
    }
    for (const f of data.flashcards) if (f.front.toLowerCase().includes(s) || f.back.toLowerCase().includes(s)) out.push({ label: f.front, sub: "Flashcard", href: "/quiz?tab=flashcards" });
    return out.slice(0, 7);
  }, [q, data]);
  return (
    <div className="relative min-w-0 max-w-md flex-1">
      <div className="flex items-center gap-2 rounded-xl border border-line bg-card px-3 py-1.5 shadow-card">
        <Search className="h-4 w-4 shrink-0 text-muted" />
        <input aria-label="Search subjects, topics and flashcards" value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} placeholder="Search subjects, topics, flashcards…" className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted" />
      </div>
      {open && q.trim().length >= 2 && (
        <div className="card absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden shadow-pop">
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted">No matches in your saved data.</p>
          ) : (
            results.map((r, i) => (
              <button key={i} onMouseDown={() => { router.push(r.href); setQ(""); }} className="block w-full px-4 py-2 text-left hover:bg-surface-low">
                <p className="truncate text-sm font-medium">{r.label}</p>
                <p className="truncate text-xs text-muted">{r.sub}</p>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function Header() {
  const { data, update } = useStore();
  const ne = nextExam(data.subjects);
  const dark = data.prefs.theme === "dark";
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-line bg-surface/85 px-4 backdrop-blur-xl lg:px-8">
      <div className="flex items-center gap-2 md:hidden">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-violet text-white"><Rocket className="h-4 w-4" /></div>
      </div>
      <GlobalSearch />
      <div className="ml-auto flex items-center gap-2">
        {ne && (
          <span className="pill-teal hidden !px-3 !py-1 sm:inline-flex">
            <Clock className="h-3.5 w-3.5" /> {ne.days === 0 ? "Exam today" : `${ne.subject.name.split(" ")[0]} exam in ${ne.days}d`}
          </span>
        )}
        <button aria-label={dark ? "Switch to light theme" : "Switch to dark theme"} className="btn-ghost !px-2" onClick={() => update((d) => ({ ...d, prefs: { ...d.prefs, theme: dark ? "light" : "dark" } }))}>
          {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
        <Link href="/planner" className="btn-primary hidden sm:inline-flex"><Plus className="h-4 w-4" /> New Plan</Link>
      </div>
    </header>
  );
}

function MiniTimer() {
  const t = useTimer();
  const path = usePathname();
  if ((t.status !== "running" && t.status !== "paused") || path === "/focus") return null;
  const m = String(Math.floor(t.remainingSec / 60)).padStart(2, "0");
  const s = String(t.remainingSec % 60).padStart(2, "0");
  return (
    <Link href="/focus" className="fixed bottom-20 right-4 z-40 flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-surface shadow-pop lg:bottom-6">
      <Timer className="h-4 w-4" /> <span className="tnum">{m}:{s}</span> {t.status === "paused" && <span className="text-xs opacity-70">paused</span>}
    </Link>
  );
}

function MobileNav() {
  const path = usePathname();
  const [more, setMore] = useState(false);
  const items = NAV.filter((n) => BOTTOM.includes(n.href));
  const rest = NAV.filter((n) => !BOTTOM.includes(n.href));
  return (
    <>
      {more && (
        <div className="fixed inset-0 z-[60] bg-ink/30 backdrop-blur-[4px] md:hidden" onClick={() => setMore(false)}>
          <div className="card fade-up absolute inset-x-3 bottom-20 p-3 shadow-pop" onClick={(e) => e.stopPropagation()}>
            <div className="mb-1 flex items-center justify-between px-2"><p className="text-xs font-semibold uppercase tracking-wide text-muted">More</p><button aria-label="Close menu" onClick={() => setMore(false)}><X className="h-4 w-4" /></button></div>
            {rest.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} onClick={() => setMore(false)} className={cn("flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium", isActive(path, href) ? "bg-primary text-white" : "hover:bg-surface-low")}>
                <Icon className="h-5 w-5" /> {label}
              </Link>
            ))}
          </div>
        </div>
      )}
      <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-[70] flex items-stretch justify-around border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {items.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} aria-current={isActive(path, href) ? "page" : undefined} className={cn("flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-semibold", isActive(path, href) ? "text-primary" : "text-muted")}>
            <Icon className="h-5 w-5" /> {label.replace("Study ", "").replace("My ", "")}
          </Link>
        ))}
        <button onClick={() => setMore((m) => !m)} aria-expanded={more} className={cn("flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-semibold", rest.some((r) => isActive(path, r.href)) ? "text-primary" : "text-muted")}>
          <MoreHorizontal className="h-5 w-5" /> More
        </button>
      </nav>
    </>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const { ready, saveError } = useStore();
  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="md:pl-16 lg:pl-64">
        <Header />
        {saveError && (
          <div className="flex items-center gap-2 bg-warn-soft px-4 py-2 text-sm text-warn" role="alert"><AlertTriangle className="h-4 w-4 shrink-0" /> {saveError}</div>
        )}
        <main className="mx-auto w-full max-w-[1400px] px-4 pb-28 pt-6 md:pb-10 lg:px-8">
          {ready ? children : <div className="py-24 text-center text-sm text-muted" aria-busy="true">Loading your study data…</div>}
        </main>
      </div>
      <MiniTimer />
      <MobileNav />
    </div>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <StoreProvider>
      <TimerProvider>
        <Shell>{children}</Shell>
      </TimerProvider>
    </StoreProvider>
  );
}
