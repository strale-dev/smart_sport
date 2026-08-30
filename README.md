# Scorence

**The Future of Sports Prediction** — premium football intelligence SaaS (Next.js).

## Getting Started

```bash
npm.cmd install
npm.cmd run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Docs

- [PRD](./docs/PRD.md)
- [Tech](./docs/Tech.md)
- [Roadmap](./docs/ROADMAP.md)
- [Database](./docs/DB.md)

## Deploy

Deploy on [Vercel](https://vercel.com). Production domain: `https://scorence.app`.

**Vercel Production environment variables** (mirror `.env.local` secrets):

- `NEXT_PUBLIC_SITE_URL=https://scorence.app`
- `RESEND_FROM=Scorence <hello@scorence.app>`
- `NEXT_PUBLIC_APP_ENV=production`
- Plus Supabase, Resend, PostHog, Sentry keys from `.env.local`

Sentry does not need domain setup — only DSN + org/project slugs.
