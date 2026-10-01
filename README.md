# Firstpass

AI lead qualification and follow-up. A lead arrives, the engine reads it into
structured data, scores it with rules, decides the next action, drafts a reply,
schedules the follow-up, and records every step.

This is a personal demonstration project. It is not client work, and all data in
the demo is generated.

## What makes it a system, not a chatbot

- A real pipeline: normalize, understand, structure, score, decide, act, verify,
  audit.
- The model extracts and drafts. The score and the routing live in code, so they
  are auditable and repeatable.
- Every run is persisted with its steps, actions, tasks, and audit trail, and can
  be replayed in the dashboard.
- It works without an OpenAI key. Without a key the pipeline uses a deterministic
  extractor, so the demo never breaks.

## Stack

- Next.js 16 (App Router) and React 19
- Tailwind CSS v4
- Prisma 6 with PostgreSQL (Prisma Postgres or any Postgres)
- OpenAI for extraction and drafting, with a deterministic fallback
- Radix primitives for tabs, dialog, and switch

## Pipeline

```
input -> normalize -> understand (AI) -> structured data -> rule engine
      -> decision -> action -> verify -> audit
```

Decision rules (configurable in Settings):

- score >= hot threshold: `BOOK_CALL`, status HOT
- score >= warm threshold: `NURTURE`, status WARM
- below warm threshold: `LOW_PRIORITY`, status COLD

## Project structure

```
prisma/
  schema.prisma        data model
  seed.ts              demo data loader
src/
  core/                reusable automation engine
    ai/provider.ts     OpenAI extraction with deterministic fallback
    ai/heuristic.ts    rule based extractor
    ai/reply.ts        reply generation
    rules.ts           scoring and routing
    settings.ts        rule config
    engine.ts          orchestrator
    seed.ts            demo data definitions
  server/queries.ts    read queries
  components/          UI kit and feature components
  app/                 routes, API handlers
    api/leads            POST intake, GET list
    api/leads/[id]/run   POST re-run
    api/tasks/[id]       PATCH complete
    api/settings         GET and POST rules
    api/webhooks/lead    POST inbound webhook
    api/seed             POST demo data
```

## Local setup

1. Create a Postgres database. Prisma Postgres is the shortest path.
2. Copy `.env.example` to `.env` and set `DATABASE_URL`.

```
DATABASE_URL="<your postgres url>"
OPENAI_API_KEY=""            # optional, falls back to the deterministic engine
OPENAI_MODEL="gpt-4o-mini"
```

3. Install, push the schema, seed, and run.

```bash
pnpm install
pnpm exec prisma db push
pnpm db:seed
pnpm dev
```

Open http://localhost:3000.

### Pooled and serverless hosts

If your provider pools connections (Prisma Postgres, Neon, Supabase pgbouncer),
append pooling flags to the URL so Prisma does not reuse prepared statements:

```
...?sslmode=require&pgbouncer=true&connection_limit=1
```

Symptom without them: `prepared statement "s0" already exists`.

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import it in Vercel. The framework is detected automatically.
3. Add environment variables in the Vercel project: `DATABASE_URL`, and
   optionally `OPENAI_API_KEY` and `OPENAI_MODEL`.
4. Deploy. The build runs `prisma generate` before `next build`.
5. After the first deploy, seed the database from the deployed app by calling
   `POST /api/seed`, or run `pnpm db:seed` locally against the same URL.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/leads` | List leads, optional `status` and `q` |
| POST | `/api/leads` | Create a lead and run the pipeline |
| POST | `/api/leads/:id/run` | Re-run the pipeline for a lead |
| PATCH | `/api/tasks/:id` | Mark a follow-up task open or done |
| GET | `/api/settings` | Read the rule config |
| POST | `/api/settings` | Update the rule config |
| POST | `/api/webhooks/lead` | Inbound lead webhook |
| POST | `/api/seed` | Load demo data (`?reset=false` to append) |

## Scripts

| Script | Action |
| --- | --- |
| `pnpm dev` | Development server |
| `pnpm build` | `prisma generate` then production build |
| `pnpm start` | Production server |
| `pnpm db:push` | Sync schema to the database |
| `pnpm db:seed` | Load demo leads and runs |
| `pnpm db:studio` | Prisma Studio |

## Design

See `DESIGN.md` for the direction, palette, typography, and the reasons behind
each choice.
