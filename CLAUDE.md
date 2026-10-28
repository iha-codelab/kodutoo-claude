# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project overview

- This is a **Next.js** web app.
- It is deployed on **Render** from the `main` branch of this GitHub repository.

## Database

- Use **Render PostgreSQL** with **Prisma**.
- Read the connection string from the `DATABASE_URL` environment variable.
- **Do not set up a local database.** No local Postgres, Docker database containers, or SQLite fallbacks.
- Commit Prisma migration files (`prisma/migrations/`) to the repository.
- Provide an **idempotent** seed script (e.g. using `upsert`), so running it multiple times is safe.

## Secrets and environment

- **Never commit credentials or `.env` files.** Make sure `.env*` is in `.gitignore` (except `.env.example`).
- Provide a `.env.example` with placeholder values only, e.g.:
  ```
  DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE"
  ```

## Build

- Before pushing application code, run `npm run build` and fix any errors.
- The build **must not require a live database connection** (e.g. avoid DB queries during static generation; use dynamic rendering for pages that read from the database). `prisma generate` is fine during build.

## Render deployment

- Configure database migrations and seeding to run on Render **before the app starts** (e.g. a pre-deploy or start command running `prisma migrate deploy` and the seed script, then starting the server).
- The server must listen on Render's `PORT` environment variable and bind to `0.0.0.0` (e.g. `next start -H 0.0.0.0 -p $PORT`).

## Workflow

- After completing implementation tasks, **commit and push** to `main` unless explicitly asked otherwise.

## Constraints

- Do not add paid services or external AI APIs.
