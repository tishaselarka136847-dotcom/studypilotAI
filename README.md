# StudyPilot AI — Your Personal AI Study Planner

Frontend-only Next.js 14 (App Router) + TypeScript + Tailwind CSS + Recharts + Lucide icons.
**AI Demo Mode:** all "AI" features are local algorithms/templates. No AI model, backend, database, API route, auth or env variable is used.

## Run locally
```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build check
```

## Deploy to Vercel
1. Push this folder to a GitHub repo (or run `npx vercel` in this folder).
2. On vercel.com → **Add New → Project** → import the repo.
3. Framework preset is auto-detected as **Next.js**. Leave build/output settings as default. No environment variables needed.
4. Click **Deploy**.

## Data & storage
All data lives in the browser under localStorage key `studypilot-ai:v1` (`src/lib/storage.ts`).
It is read only after client mount (never during SSR), validated/sanitised on load, and written on every change.
The coach chat uses `sessionStorage` (session-only). Settings → "Clear all saved data" wipes everything.

## Structure
- `src/lib/` types, storage, store (context), scheduler, summarizer, coach, quiz bank, stats, timer
- `src/components/` AppShell (sidebar / mobile nav / header), UI primitives, quiz-set editor
- `src/app/` pages: dashboard, planner, subjects, notes, quiz (+flashcards), coach, focus, analytics, settings
