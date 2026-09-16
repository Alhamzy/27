# 27

Arabic-first prayer/Iqamah web app for Oman. The approved Stitch export is the UI contract.

## Stack
- Next.js + TypeScript
- Supabase Postgres/Auth/RLS
- Vercel preview + production deployments
- Playwright E2E + screenshot regression

## UI contract
Do not redesign the supplied Stitch baseline. Public and admin implementations should extend it. Arabic/RTL is primary.

## Release flow
feature branch -> Vercel preview -> Playwright functional + visual checks -> merge to main -> production.

## Environment
Copy `.env.example` to `.env.local` and add the Supabase project URL and publishable key. Never expose a service-role key in browser code.
