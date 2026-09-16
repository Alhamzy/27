# Batch 6 — Email OTP Admin Onboarding

POC decision: use Supabase Auth email OTP with Supabase's built-in email delivery. Bird/custom SMTP is not required for the POC and remains an optional production hardening step.

Flow:
1. User opens `/admin` and is redirected to `/admin/login` when unauthenticated.
2. User enters an email address.
3. App calls `signInWithOtp({ email, options: { shouldCreateUser: true } })`.
4. User enters the six-digit OTP from the email.
5. App verifies using `verifyOtp({ email, token, type: 'email' })`.
6. Account/session creation and login share the same flow.
7. Mosque authorization remains separate through `mosque_admins` + RLS. A newly created Auth user has no mosque editing rights until assigned.

POC configuration note: the Supabase Magic Link email template must expose `{{ .Token }}` so the email includes the six-digit OTP. External SMTP can be configured later for production deliverability, branding and higher-volume sending.
