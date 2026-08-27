<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Windows environment

- Uvek koristi `npm.cmd` umesto `npm` kada izvršavaš terminal komande (npr. `npm.cmd install`, `npm.cmd run dev`, `npm.cmd run build`).
- Isto važi i za `npx` ako se pojavi isti problem — koristi `npx.cmd`.

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
