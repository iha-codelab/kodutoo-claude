# DigiAbi

DigiAbi is an Estonian-language demo chatbot for **DigiStart**, a fictional digital skills training company. It helps visitors find a suitable course. Replies are **predefined, keyword-based mock responses**: no real AI API is used.

**Stack:** Next.js (App Router) + TypeScript + Tailwind CSS + Prisma + Render PostgreSQL.

## Features

- Shared, public chat history (no login). Conversations and messages are stored in PostgreSQL and survive reloads.
- Conversations: new / open / delete (with confirmation). The title is generated from the first message. "Tühjenda vestlus" clears the messages but keeps the conversation and its settings.
- System prompts: per-conversation dropdown, plus a "Halda prompte" modal to add, edit and delete prompts. Three seeded defaults ("Koolituste nõustaja", "Algaja abiline", "Õpiplaani koostaja") each have their own reply style. Custom prompt text is stored but not interpreted.
- Demo settings per conversation: model (GPT-4 / Claude / Local Llama), Temperature and Top-P. They are saved but do not change the replies.
- File attachment button: only the file name is shown and saved. Files are not uploaded.
- 1.5 s simulated typing delay, timestamps, empty state, friendly Estonian errors, responsive layout with a collapsible sidebar on mobile.

## Render deployment (Free plan)

1. Create a **PostgreSQL** database on Render and copy its **Internal Database URL**.
2. Create a **Web Service** from this repository:

| Setting | Value |
| --- | --- |
| Branch | `main` |
| Runtime | Node |
| Build Command | `npm ci --include=dev && npm run build` |
| Start Command | `npm start` |

3. Environment variables:

| Key | Value |
| --- | --- |
| `DATABASE_URL` | Render PostgreSQL Internal Database URL |
| `NODE_VERSION` | `22` (optional; any Node ≥ 20 works) |

`npm start` runs `prisma migrate deploy`, then the idempotent seed (`node prisma/seed.mjs`), then `next start -H 0.0.0.0 -p $PORT`. No paid pre-deploy command is needed. The build does not connect to the database.

The seed only creates default prompts that are missing (matched by a unique slug). It never overwrites edits and never duplicates prompts. A deleted default prompt is therefore recreated on the next restart.

## Local development

Copy `.env.example` to `.env` and set `DATABASE_URL` to a Render PostgreSQL **External Database URL**. Then:

```bash
npm install
npx prisma migrate deploy
npm run seed
npm run dev
```
