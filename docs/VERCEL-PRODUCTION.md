# Vercel production deploy

If GitHub `main` is ahead of what [scorence.app](https://scorence.app) serves:

1. Vercel → **smart-sport** → **Deployments** — clear all filters (Author, Status).
2. Confirm a deployment exists for the latest commit on `main`. If not, Git integration may have missed a push; push any commit to `main` or use **Create Deployment** → branch `main`.
3. Do **not** use **Redeploy** on an old deployment — that re-ships old code. Promote the deployment that matches the latest `main` commit, or redeploy from Git at that commit.
4. After deploy, run pending Supabase migrations on the **production** project (`supabase db push` linked to prod, or MCP).

Production search requires migration `0032_global_search.sql` on the live database.
