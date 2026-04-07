---
inclusion: auto
description: Pre-deployment checklist and workflow for deploying to Vercel with the highest likelihood of success.
---

# Skill: Deploy to Vercel

## Trigger Phrases

When the user says any of the following (or similar intent), you MUST execute the full Pre-Deployment Checklist below before proceeding:
- "push to vercel"
- "deploy to vercel"
- "deploy to production"
- "deploy to prod"
- "merge to main"
- "merge to master"
- "push to main"
- "push to master"
- "ready to deploy"
- "ship it"
- "go live"
- "send it to prod"
- "vercel deploy"

When triggered, run each step in the checklist sequentially. If any step fails, stop and fix the errors before continuing. Do NOT push, merge, or deploy until all steps pass.

## Pre-Deployment Checklist

Run these in order. Every step must pass before pushing.

### 1. TypeScript Type Check

```bash
npm run typecheck
```

This runs `tsc --noEmit` against the project (test files are excluded via tsconfig.json).
Fix all errors before proceeding — Vercel will fail the build on type errors.

### 2. ESLint

```bash
npm run lint
```

Runs `next lint` with the `.eslintrc.json` config. Warnings are OK, errors will fail the Vercel build.
The config extends `next/core-web-vitals` which is what Vercel expects.

### 3. Next.js Production Build

```bash
npm run build
```

This runs `tsx scripts/migrate.ts && next build` — the same command Vercel executes.
The build will catch:
- Import errors (missing modules, circular deps)
- Server/client component boundary violations
- Invalid `use client` / `use server` directives
- Static generation failures
- Image optimization config issues

### 4. All-in-One Check (Recommended)

```bash
npm run build:check
```

Runs typecheck → lint → build in sequence. If this passes, Vercel will pass.

## Common Vercel Build Failures & Fixes

### TypeScript errors in test files
Test files (`*.test.ts`, `*.test.tsx`, `tests/`) are excluded from `tsconfig.json` and `.eslintrc.json`. If a new test file pattern appears, add it to both exclude lists.

### Missing environment variables
Vercel builds need these env vars set in the Vercel dashboard:
- `DATABASE_URL` or `POSTGRES_URL` (auto-set if using Vercel Postgres)
- `BLOB_READ_WRITE_TOKEN` (auto-set if using Vercel Blob)
- `AUTH_SECRET` / `NEXTAUTH_SECRET`
- `NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN`
- `NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN`
- `KV_URL`, `KV_REST_API_URL`, `KV_REST_API_TOKEN` (auto-set if using Vercel KV)

The build script runs `tsx scripts/migrate.ts` before `next build`. If `DATABASE_URL` is not set on Vercel, the migration will fail. Ensure Vercel Postgres is connected.

### ESLint rule not found errors
If you see `Definition for rule 'X' was not found`, it means an `eslint-disable` comment references a plugin that isn't installed. Remove the directive or install the plugin.

### Module not found
Check that the import path uses `@/` alias correctly and the file actually exists. Common after file moves or renames.

### Server Component importing client-only code
If a server component imports something that uses `useState`, `useEffect`, etc., either:
- Add `'use client'` to the importing component
- Move the client logic to a separate `*Client.tsx` component

### Node.js version mismatch
The project pins Node 20 via `.nvmrc`. Vercel defaults to Node 20.x. If you need a different version, set it in Vercel project settings → General → Node.js Version.

## Deployment Commands

```bash
# Preview deployment (creates a unique URL)
npm run deploy:preview

# Production deployment (deploys to main domain)
npm run deploy
```

## Post-Deployment Verification

After a successful deploy:
1. Check the Vercel deployment URL loads correctly
2. Verify `/admin/login` is accessible
3. Spot-check one storefront page and one API route
4. Check Vercel Functions tab for any runtime errors

## Build Configuration Summary

| Setting | Value | Where |
|---|---|---|
| Node.js | 20 | `.nvmrc` |
| Build command | `tsx scripts/migrate.ts && next build` | `package.json` → `build` |
| TypeScript errors | Fail build | `next.config.js` → `typescript.ignoreBuildErrors: false` |
| ESLint errors | Fail build | `next.config.js` → `eslint.ignoreDuringBuilds: false` |
| Test files | Excluded from build checks | `tsconfig.json` + `.eslintrc.json` excludes |
| Framework | Next.js 14.2 (App Router) | `package.json` |
