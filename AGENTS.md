<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Windows environment

- Uvek koristi `npm.cmd` umesto `npm` kada izvršavaš terminal komande (npr. `npm.cmd install`, `npm.cmd run dev`, `npm.cmd run build`).
- Isto važi i za `npx` ako se pojavi isti problem — koristi `npx.cmd`.

## Cloud Agent environment

On Linux, including Cloud Agents, use `npm` and `npx`. `npm.cmd` and `npx.cmd` are for Windows only.

Node.js 22 is already installed and satisfies Next.js (`>=20.9.0`). GitHub Actions CI uses Node.js 24.

If `.env.local` is missing, copy `.env.example` to `.env.local`. Those placeholders are enough for `npm run check:ci`, `npm run build`, and `npm run dev`. The dev server listens on port 3000. Live Supabase, Redis, API-Football, and OpenAI calls need real credentials in `.env.local` or the process environment.

# Project source of truth

Before implementing features, check the relevant project docs:

- Product requirements: `docs/PRD.md`
- Architecture: `docs/Tech.md`
- Database schema: `docs/DB.md`
- Roadmap: `docs/ROADMAP.md`

Rules:

- Do not invent product requirements that are not in PRD/SoW.
- Follow the architecture docs before introducing new patterns.
- Follow the database schema before creating or changing tables.
- Follow the design system from cursor rules before building UI.

## API Key

The project already has a valid API key configured in `.env.local`.

- Do NOT ask the user for the API key.
- Do NOT ask whether an API key is available.
- Do NOT ask the user to create a new API key.
- Use the existing environment variable automatically.
- Never expose, print, log, hardcode, or commit the API key.
- Only report an API key issue if the key is genuinely missing, invalid, or rejected.
