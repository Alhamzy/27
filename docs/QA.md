# Visual-aided debugging strategy

1. Stitch screenshots in `docs/design-baseline/` are the design contract.
2. Each PR should get a Vercel preview URL.
3. Playwright exercises Arabic/RTL mobile and desktop flows.
4. Visual checks capture public and admin screens. Dynamic time/countdown regions should be mocked or masked before strict baselines are approved.
5. On failure, retain screenshot, trace, video, console/network evidence and inspect Vercel build/runtime logs.
6. After DB migrations, run Supabase security and performance advisors.
7. Production promotion only after preview functional + visual QA is green.

## Debug sequence

When a UI test fails:
1. Open the Playwright screenshot artifact.
2. Open the retained trace and inspect DOM, requests and console output.
3. Compare against the approved Stitch baseline image.
4. If server-side, inspect Vercel runtime logs by request/route.
5. If data/auth-related, reproduce against Supabase and re-run security advisors after policy changes.
