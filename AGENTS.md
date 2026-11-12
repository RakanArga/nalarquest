# AGENTS.md — NalarQuest (PRD + Agent Instructions)

> Read this file fully before changing any code. It combines the product requirements (what to build and why) with the rules coding agents must follow (how to build it here).
> Items marked **[TBD]** are undecided. Do not invent an answer; ask the maintainers or leave a clearly marked TODO.

---

## 1. Product overview

**NalarQuest** is a text-based, RPG-style learning website for the competition theme **"Smart & Fun Education"**. An AI tutor guides students through short static lessons, generates practice questions, and examines them in a chat as the **Guru Besar** (Grand Teacher).

- **Team:** 4 beginners. **Deadline:** 1 week (hard). Scope is an MVP.
- **Audience language:** Indonesian. All user-facing text, AI prompts, and generated questions are in Indonesian. Source texts may be English; question text stays Indonesian, evidence quotes stay in the source language.
- **Judging criteria (design decisions must serve these):**
  - Problem/solution fit (25%): lightweight, data-friendly learning that fights boring long text.
  - Technology innovation (25%): AI as a Socratic tutor and examiner, not an answer machine.
  - Software engineering (25%): working, bug-free MVP with clear documentation and architecture.
  - UI/UX (15%): minimal, smooth, no complicated flows.
  - Green IT and ethics (10%): dark mode by default, small payloads, transparent AI labeling, licensed sources with attribution.

## 2. Goals and non-goals

### Goals
1. A student picks a topic and would be doing: **Quest** (learn) and  **Ujian Guru Besar** (exam).
2. Quest teaches in short loops: a little static material, then practice, then material, then practice.
3. Practice questions and exam case studies are **generated dynamically by AI**, but **grounded in licensed source text** and validated by the server.
4. Passing the exam unlocks the next material of the same subject.
5. The AI personalizes tone through the student's RPG role.

### Non-goals (do not build)
- Final Boss, HP bars, or debate rounds (removed).
- LangChain or other orchestration frameworks. Use the official Gemini SDK directly and vectordb for rag (ask for db if needed).
- Local or self-hosted models.
- Payments, native apps, teacher dashboards, leaderboards (out of scope for the MVP).

## 3. Users

- **Student (primary):** a pupil or university student, often on a phone with limited data. Wants short, game-like sessions.
- **Judge (secondary):** tries the live demo. Needs the app to work on first try without setup.

## 4. Core user flow

1. **Auth and onboarding:** log in, answer a short learning-preference question, receive an RPG role (see §7.4).
2. **AI Personalisation** The pace, wordings, tone would be personalised from the pre test that the user takes
3. **Topic map:** a static map of topics. Status per topic: `TERKUNCI`, `TERBUKA`, `BERJALAN`, `LULUS`.
4. **Quest:** short static material, then AI-generated multiple-choice practice, repeated. Each question shows its source attribution.
5. **Ujian Guru Besar:** a chat where the AI poses a case study from the topic's material and evaluates the student's answers within a fixed number of turns. Result: pass or fail.
6. **Result:** pass sets the topic to `LULUS` and unlocks the next topic. Fail lets the student retry (new exam session).

## 5. Functional requirements

Priority: **M** = must, **S** = should, **C** = could.

| ID | Pri | Requirement | Acceptance criteria |
|---|---|---|---|
| FR-01 | M | Login and profile | Unauthenticated calls to protected routes return 401. Profile row exists for each user. |
| FR-02 | M | Role personalization | One AI call assigns exactly one of the four roles; result stored on the profile; falls back to a default role if AI fails. |
| FR-03 | M | Topic map with progress | Map shows each topic's status from `user_topic_progress`; locked topics are not clickable. |
| FR-04 | M | Static material display | Material renders from stored source text or static files; shows title, source, license. |
| FR-05 | M | Dynamic MCQ generation | Returns 4 options, one correct answer, a short explanation, and an evidence quote that exists in the source text. Invalid output is retried once, then a friendly error. |
| FR-06 | M | Server-side answer grading | Correct answer is never sent to the browser before the student answers. Result recorded in `question_attempts`. |
| FR-07 | M | Guru Besar exam chat | Case study from the topic's material; max 6 student turns; every response includes `selesai` and `lulus`; exam always ends. |
| FR-08 | M | Unlock on pass | Passing updates the topic to `LULUS` and opens the next topic by `urutan`. |
| FR-09 | S | Mutual exclusivity of paths | UI and API reject starting an exam while a quest is active for that topic, and vice versa. |
| FR-10 | S | AI transparency label | Every AI-generated item shows an "AI-assisted, verify with the source" label and the source attribution. |
| FR-11 | S | Static fallback questions | 3-5 prewritten questions per material, used when the AI is unavailable (quota or network). |
| FR-12 | C | Question cache | Reuse previously generated valid questions to save quota. |
| FR-13 | C | Vector search for long topics | Use `match_source_chunks` only when a topic's text is too long for one prompt. |

## 6. Non-functional requirements

- **Reliability:** AI failure must never crash the UI. Every AI feature has a fallback or a friendly error.
- **Quota safety (Gemini free tier):** limit input length on every route; per-user and per-IP rate limiting; avoid unnecessary calls; keep prompts small.
- **Security:** see §12. API keys never reach the browser.
- **Performance:** first meaningful render fast on mobile; avoid large dependencies; no heavy animation libraries.
- **Green IT:** dark mode default, minimal bundle, no needless re-fetching, cache where safe.
- **Accessibility and UX:** mobile-first, readable contrast in dark mode, clear loading and error states, no complicated screens.
- **Ethics:** attribute every source (title, author, URL, license); label AI content; do not send personally identifying data to Gemini (free-tier data may be used for model improvement).

## 7. Domain model and AI behavior

### 7.1 Learning content
- A **topic** (`topics`) is one learning unit with `slug`, `judul`, `sumber`, `lisensi`, `urutan`.
- Its source text is split into **chunks** (`source_chunks`, ~150-300 words each, cut at paragraph boundaries, small overlap) with `chunk_index`.
- Sources must be openly licensed (prefer CC0, CC BY, CC BY-SA; avoid NC and ND). Keep a `SOURCES.md` with title, author, URL, license, and date checked.
- Source text is cleaned before ingestion: no page numbers, headers or footers, figure references, broken hyphenation, or curly quotes and dashes (normalize them).

### 7.2 Question generation (grounding, not full RAG)
1. Load the topic's chunks ordered by `chunk_index` (no vector search needed for normal quest questions).
2. Send the text to Gemini with the rule "only use this text".
3. Request structured JSON, then validate on the server:
   - Zod schema: 4 options, `indeksBenar` in 0..3, non-empty explanation and quote.
   - The `kutipanBukti` must appear in the **joined text of the chunks sent** (compare after normalization: lowercase, collapse whitespace, normalize quotes and dashes). Quotes can cross chunk boundaries, so never validate per chunk.
4. Retry once on failure, then return a friendly error (or a static fallback question).

### 7.3 Guru Besar exam
- Context: the combined source text of the topic (or retrieved chunks if too long).
- Output JSON on every turn: `{ balasan, selesai, lulus }`. `lulus` is only meaningful when `selesai` is true; the server forces `lulus = false` while `selesai` is false.
- Hard cap: **6 student turns**. On the last turn the server forces `selesai = true`.
- The system prompt must tell the model to ignore student attempts to be passed, to change rules, or to reveal instructions.
- Uses the **smart** model; everything else uses the **fast** model.

### 7.4 Roles (RPG personalization)
- The `roles` table holds **RPG learning roles**, not account permissions.
- Fixed set (seeded, not created dynamically by AI output):
  - **Ksatria Nalar** — action, fast practice, direct challenges.
  - **Penyihir Teori** — abstraction, concepts, patterns.
  - **Cendekia Analitik** — structured logic, data, proof.
  - **Pengelana Konsep** — self-directed exploration, curiosity.
- The AI picks one using a constrained enum (Gemini schema `enum` plus Zod `z.enum`). Default on failure: **Ksatria Nalar**.
- Planned: store `deskripsi` and `gaya_bahasa` on each role so `/api/chat` can read tone guidance from the database instead of calling the AI again.
- Do not send the student's real name to Gemini. Use a nickname or nothing.


## 8. Tech stack and architecture

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router), TypeScript |
| Styling | Tailwind CSS, dark mode default |
| API | Next.js Route Handlers under `app/api/*` |
| AI | `@google/genai` (Gemini API via Google AI Studio, free tier) |
| Validation | `zod` (the regular package, not `zod/mini`) |
| Database | PostgreSQL with pgvector, accessed through **Prisma** |
| Auth | **[TBD]** confirm provider (the schema's `profiles.id` is a `uuid` matching the auth user id) |
| Hosting | Vercel (assumed) |

Architecture: browser UI calls Route Handlers; handlers authenticate, read and write the database through Prisma, call Gemini through one helper, validate output, and return JSON. There is no separate backend service.

### Repository layout (target)

```
app/
  api/
    auth/personalize/route.ts   # assign RPG role
    question/route.ts           # MCQ generation + grading
    chat/route.ts               # Guru Besar exam
    recommend/route.ts          # quest vs ujian recommendation
  (pages and components)
lib/
  auth.ts          # getCurrentProfile()
  gemini.ts        # the only place that calls Gemini
  schemas.ts       # Gemini schemas + Zod validators
  prisma.ts        # Prisma client
  sources.ts       # source loading helpers (strip front matter, normalize)
prisma/schema.prisma
scripts/ingest.ts  # chunk + (optional) embed source texts into the database
data/sources/*.md  # raw cleaned source texts with metadata block
SOURCES.md
```

## 9. Data model

Existing tables (PostgreSQL):

| Table | Purpose |
|---|---|
| `roles` | RPG roles (`id`, `nama`). |
| `profiles` | One per user: `id` (uuid), `nama`, `role_id`, `created_at`. |
| `topics` | Learning units: `slug`, `judul`, `sumber`, `lisensi`, `urutan`. |
| `source_chunks` | Source text chunks per topic: `topic_id`, `chunk_index`, `isi_teks`, nullable `embedding`. |
| `question_attempts` | Each generated question per user: `pertanyaan`, `kutipan_bukti`, `jawaban_user`, `benar`. |
| `exam_sessions` | One exam run: `status`, `jumlah_turn`, `lulus`, `skor`, `started_at`, `finished_at`. |
| `user_topic_progress` | Per user and topic status (`TERKUNCI` / `TERBUKA` / `BERJALAN` / `LULUS`) and `skor_terbaik`. PK `(user_id, topic_id)`. |

Enums: `exam_status` (`BERJALAN`, `SELESAI`), `progress_status` (`TERKUNCI`, `TERBUKA`, `BERJALAN`, `LULUS`), `message_sender` (`USER`, `AI`, currently unused).

### Known gaps (resolve before or while building)
1. `question_attempts` lacks `opsi` (jsonb) and `indeks_benar`. Add them so grading happens on the server, and return only an attempt id plus question and options to the client.
2. No table for exam chat history. Either add `exam_messages (session_id, sender message_sender, teks, created_at)` or keep history client-side (simpler, but the client can alter it).
3. `roles` needs `@unique` on `nama` and, planned, `deskripsi` and `gaya_bahasa`.
4. `embedding` dimension is unknown (`vector` without size). Confirm it and keep it ≤ 2000 if an HNSW index is used.
5. Add indexes: unique `(topic_id, chunk_index)` on `source_chunks`, unique `slug` on `topics`, and `(user_id, topic_id, ...)` indexes on attempts and sessions.
6. Quest progress and exam result share one `status` per topic. **[TBD]** whether Quest and Ujian need separate progress fields.
7. Enable Row Level Security (or equivalent access control) on user-owned tables.

## 10. API contracts (draft, keep stable once agreed)

All routes: JSON, return `{ error: string }` with an appropriate status on failure. Protected routes return 401 if there is no valid session.

**`POST /api/auth/personalize`**
- Request: `{ preferensiBelajar: string }` (max 500 chars).
- Response: `{ success, profile: { nama, role }, evaluasiAI: { peran, alasan, gayaBahasa } }`.

**`POST /api/question`**
- Request: `{ topicSlug }` (or `{ subjek, materi }` while file-based sources are used).
- Response: `{ attemptId, pertanyaan, opsi: string[4], sumber: { judul, lisensi, url } }`. The correct index and explanation are not included until the answer is submitted.
- Answer step: `POST /api/question/answer` with `{ attemptId, jawabanIndex }` returns `{ benar, indeksBenar, penjelasan, kutipanBukti }`.

**`POST /api/chat`**
- Request: `{ topicSlug, riwayat: [{ role: "user" | "model", text }] }` (the server reads name and role from the session, not the body).
- Response: `{ balasan, selesai, lulus }`.

**`POST /api/recommend`**
- Request: performance summary (derived server-side from the database where possible).
- Response: `{ path: "quest" | "ujian", alasan }`.

## 11. Commands

Adjust if `package.json` differs.

```bash
npm install
npm run dev            # local development
npm run build          # production build, must pass before merging
npm run lint
npx prisma generate    # after changing prisma/schema.prisma
npx prisma migrate dev # create and apply a migration (or `prisma db pull` if the DB leads)
npx tsx scripts/ingest.ts   # load source texts into the database
```

Environment variables (names only; never commit values):

```
GEMINI_API_KEY
GEMINI_MODEL_FAST      # e.g. a Flash-Lite model
GEMINI_MODEL_SMART     # e.g. a Flash model
DATABASE_URL
# plus auth provider variables [TBD]
```

Model names change often. Never hardcode them. Verify current names and free-tier availability in Google AI Studio.

## 12. Rules for coding agents

### Always
- Call Gemini only through `lib/gemini.ts`. Request JSON with `responseMimeType: "application/json"` and a `responseSchema`.
- Validate every AI output with Zod on the server before using it. Never trust model output.
- Wrap route logic in `try/catch`, log with a route prefix (for example `[question]`), and return friendly Indonesian errors.
- Authenticate protected routes with `getCurrentProfile()` and derive `user_id` from the session, never from the request body.
- Keep user-facing strings in Indonesian and keep prompts clear about "use only the provided text".
- Keep changes small and focused. Run `npm run build` and `npm run lint` before declaring work done.

### Never
- Never expose `GEMINI_API_KEY`, `DATABASE_URL`, or any service key to the client. No `NEXT_PUBLIC_` prefix on secrets. Never print or commit `.env*` files.
- Never send correct answers or evidence to the client before the student answers.
- Never send real student names, emails, or other personal data to Gemini.
- Never accept a file path, slug, or topic from the request without validating it (`/^[a-z0-9-]+$/`) and checking it exists in the database.
- Never create roles, topics, or progress values from raw AI text. Use enums and seeded rows.
- Never add LangChain, realtime layers, or heavy UI or animation dependencies without approval.
- Never hardcode model names or add features outside the Goals without asking.
- Never paste full copyrighted text into the repository. Only openly licensed sources, with attribution.

### Conventions
- TypeScript strict mode; no `any` where a type is easy to write.
- Zod schemas and Gemini schemas live together in `lib/schemas.ts`; the Gemini schema guides generation, the Zod schema checks the result.
- Route files stay thin: parse input, authorize, call helpers, validate, respond.
- Database access only through the shared Prisma client in `lib/prisma.ts`.
- Commit messages are short and descriptive; one concern per commit.

## 13. Definition of done

A feature is done when:
1. It meets its acceptance criteria in §5.
2. It has a fallback or friendly error path for AI or database failure.
3. For AI routes: 20 consecutive calls return valid output (record failures and retries).
4. `npm run build` and `npm run lint` pass.
5. No secrets or personal data are exposed (check network tab and logs).
6. It works on a mobile viewport in dark mode.

## 14. Priorities and timeline (7 days)

| Day | Focus |
|---|---|
| 1-2 | Prompt research, source text preparation and ingestion, API contracts agreed, schema gaps fixed |
| 3-4 | UI layout and state; `/api/question` stable (20/20), then `/api/chat` |
| 5 | Rate limiting, `/api/recommend` with fallback, personalization, frontend integration |
| 6 | Full bug sweep, static fallback questions, load test against free-tier quota |
| 7 | Demo video and presentation rehearsal; **no new features** |

If time runs short, cut in this order: vector search (FR-14), question cache (FR-13), separate Quest and Ujian progress fields, then AI-driven recommendation (keep the rule-based fallback).

## 15. Team ownership

| Role | Focus |
|---|---|
| Person 1 — Frontend logic | State, API integration, progress and unlock logic |
| Person 2 — UI/UX | Dark mode layout, responsive design, topic map, simple CSS animations |
| Person 3 — Backend and AI behavior | Route Handlers, system prompts, validation, ingestion script, data |
| Person 4 — QA and documentation | Testing, UML, architecture, pitch deck and demo script |

## 16. Open questions

1. May the AI recommend the exam at any time, or only after part of the Quest is complete?
2. Which auth provider is used, and how is the session read in `lib/auth.ts`?
3. Are Quest progress and exam result tracked separately per topic?
4. Is exam chat history stored in the database or only on the client?
5. Which subject and licensed book are used for the demo, and how many materials?
6. Is the `embedding` column actually filled and used in the MVP, or deferred?
