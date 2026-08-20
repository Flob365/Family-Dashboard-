# Maison — Family Command Center

Maison is an installable React/Vite family organizer for a shared agenda, shopping list,
household tasks, and school/nursery information. The interface is in French and ships with a
local demo mode that requires no account and sends no data.

## Requirements and local commands

- Node.js 22.22.2 or newer (see `package.json`)
- npm
- Supabase CLI for connected-mode database work

```bash
npm install
npm run dev
npm run lint
npm test -- --run
npm run build
npx playwright install chromium
npm run test:e2e
```

Playwright requires its matching Chromium binary on a clean checkout. On Linux machines that
also need the browser's system libraries, install both together with
`npx playwright install --with-deps chromium`. Standard local and CI runs use Playwright's
managed browser. A pre-existing compatible binary is only a diagnostic fallback:

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/absolute/path/to/chromium npm run test:e2e
```

The e2e runner always starts its own isolated demo server and will fail rather than reuse a
different process already listening on the configured port.

With neither Supabase variable present, `npm run dev` starts in demo mode. Demo records are
stored only in the browser's local storage and the `Démo` badge distinguishes that session from
a connected household. On a fresh demo profile, the sample agenda is anchored to the current
day so the Today page remains useful after installation. Supplying only one variable is treated
as a configuration error rather than silently starting a partially connected application.

## Supabase project setup

Create a Supabase project, then copy `.env.example` to `.env.local` and set only these public
browser values:

```dotenv
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Use the project's publishable browser key. Never expose a secret or service-role key to Vite,
the repository, logs, screenshots, or a deployed client.

For a fresh hosted project:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
npx supabase test db
```

For a reproducible local database:

```bash
npx supabase start
npx supabase db reset
npx supabase test db
```

Committed migrations in `supabase/migrations/` are the source of truth. Create schema changes
with `npx supabase migration new descriptive_name`, edit the generated SQL, reset and run the
pgTAP suite locally, then use `npx supabase db push` for the linked project. Do not make lasting
schema changes only through the dashboard.

In Supabase Authentication, configure the production Site URL and allow both the local origin
and deployed Vercel origin as redirect URLs. Email/password authentication and confirmation are
handled by Supabase Auth.

### Disposable connected browser acceptance

The committed Playwright suite stays in isolated demo mode by default. A separate connected
scenario can exercise two confirmed disposable users, invitation acceptance, Realtime sharing,
and a foreign-household RLS denial. Run it only against a disposable Supabase project that will
be reset immediately afterwards:

```bash
CONNECTED_E2E_DISPOSABLE_PROJECT_ACK=I_WILL_RESET_THIS_DISPOSABLE_PROJECT \
CONNECTED_E2E_OWNER_EMAIL=... \
CONNECTED_E2E_OWNER_PASSWORD=... \
CONNECTED_E2E_PARTNER_EMAIL=... \
CONNECTED_E2E_PARTNER_PASSWORD=... \
CONNECTED_E2E_FOREIGN_HOUSEHOLD_ID=... \
VITE_SUPABASE_URL=... \
VITE_SUPABASE_PUBLISHABLE_KEY=... \
npm run test:e2e -- e2e/connected-two-user.spec.ts
```

The acknowledgement prevents an accidental run against the family production project. The
accounts must already be email-confirmed, start without a household, and must not be personal
accounts. No service-role key is accepted by the browser harness.

## Household invitation flow

1. The first signed-in adult creates a household from `/bienvenue`.
2. The household owner enters the partner's exact email address and creates a seven-day
   invitation link.
3. The partner opens that link, signs up or signs in with that same normalized email, enters a
   display name, and accepts the invitation.
4. The secure database RPC validates the authenticated email, invitation expiry, household
   ownership, and available member slot before creating the membership. A token is single-use.

Invitation tokens are temporarily retained through sign-in in browser session storage and are
removed from the visible URL immediately. Share invitation links privately; they are bearer
secrets until accepted or expired.

## Privacy and offline boundaries

Connected business data is scoped by PostgreSQL Row Level Security to authenticated household
members. Private invitation rows are not directly exposed to browser roles; narrow RPCs perform
household creation, invitation issuance, and acceptance. Health is only an event category—this
version is not a medical record system and stores no documents or audio.

The PWA caches the application shell and can retain recently viewed client state during a short
connection loss. The offline banner deliberately does not promise synchronization: connected
mutations are not placed in a durable offline queue. Due reminders remain visible in Today even
when browser notifications are unavailable or denied. Notification permission is requested only
after the user clicks `Activer les notifications`; reliable background delivery would require a
separate scheduled server service.

## Vercel deployment

Import the repository into Vercel with the Vite preset, use `npm run build`, and publish `dist/`.
Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` separately for the intended Vercel
environments. After deployment, add the exact HTTPS origin to the Supabase Auth Site URL/redirect
allowlist and exercise sign-in, household creation, invitation acceptance, and one shared
mutation before promoting the release.

## Future speech-to-text boundary

The disabled `Bientôt` microphone reserves an interface boundary; V1 performs no recording or
transcription. A future extension may accept a user-initiated audio recording, send it to a
replaceable transcription adapter, convert the response into typed draft actions, and require an
explicit confirmation before repository writes. No audio should be retained by default, and the
provider must remain outside the domain and repository layers.
