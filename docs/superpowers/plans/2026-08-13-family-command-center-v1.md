# Family Command Center V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and publish a mobile-first shared family organizer whose primary screen gives both parents a ten-second view of today.

**Architecture:** A React/Vite PWA renders one shared product surface backed by repository interfaces. Demo repositories persist to local storage; connected repositories use Supabase Auth, Postgres, Row Level Security, and Realtime. Feature folders own their UI and domain behavior, while the `today` feature composes read models from calendar, tasks, shopping, and child items.

**Tech Stack:** React, TypeScript, Vite, React Router, TanStack Query, Zod, date-fns, Lucide, Supabase JS, Vitest, Testing Library, Playwright, vite-plugin-pwa, CSS modules/global design tokens.

## Global Constraints

- The default mobile viewport is 375 × 812 px and every touch target is at least 44 × 44 px.
- The primary mobile navigation labels are `Aujourd'hui`, `Agenda`, `Courses`, `Maison`, and `Enfants`.
- `Enfants` contains the two tabs `École` and `Crèche`.
- The Today screen contains no charts, productivity statistics, or weekly summary.
- Use an ivory background, midnight text, sage primary accent, and restrained terracotta/soft-blue child accents.
- Real household data is accessible only to authenticated members of the same household.
- Every exposed `public` table has RLS enabled; update policies contain both `USING` and `WITH CHECK`.
- The frontend contains only a Supabase publishable key; a service-role or secret key must never enter client code.
- Supabase packages are pinned and the lockfile is committed.
- The V1 reserves a microphone control marked `Bientôt` but does not record or transmit audio.
- Demo mode sends no data to Supabase and remains clearly identifiable.
- UI copy is French.

---

## File Map

```text
family-command-center/
├── public/
│   ├── icon-192.png
│   ├── icon-512.png
│   └── maskable-icon-512.png
├── src/
│   ├── app/
│   │   ├── App.tsx                 # Route composition and providers
│   │   ├── AppShell.tsx            # Responsive navigation shell
│   │   └── router.tsx              # Route definitions
│   ├── components/
│   │   ├── AddSheet.tsx            # Shared quick-add bottom sheet
│   │   ├── EmptyState.tsx
│   │   ├── ErrorState.tsx
│   │   ├── IconButton.tsx
│   │   └── SegmentedControl.tsx
│   ├── features/
│   │   ├── auth/                    # Session, sign-in, household onboarding
│   │   ├── today/                   # Today read model and screen
│   │   ├── calendar/                # Events and agenda views
│   │   ├── shopping/                # Shared grocery list
│   │   ├── household/               # Household tasks and recurrence
│   │   └── children/                # School and nursery items
│   ├── lib/
│   │   ├── config.ts                # Environment validation and app mode
│   │   ├── supabase.ts              # Browser client singleton
│   │   ├── queryClient.ts
│   │   └── dates.ts
│   ├── repositories/
│   │   ├── contracts.ts             # Repository interfaces
│   │   ├── demoRepository.ts        # localStorage implementation
│   │   ├── demoSeed.ts              # Realistic non-sensitive seed data
│   │   └── supabaseRepository.ts    # Connected implementation
│   ├── styles/
│   │   ├── tokens.css
│   │   └── global.css
│   ├── test/
│   │   ├── setup.ts
│   │   └── renderApp.tsx
│   ├── types/domain.ts
│   └── main.tsx
├── supabase/
│   ├── config.toml
│   ├── migrations/*_initial_schema.sql  # exact prefix produced by Supabase CLI
│   └── tests/rls_households.test.sql
├── e2e/core-flow.spec.ts
├── .env.example
├── package.json
├── package-lock.json
├── playwright.config.ts
├── vite.config.ts
└── README.md
```

---

### Task 1: Produce and lock the complete visual concept

**Files:**
- Create: `docs/design/family-command-center-concept.png`
- Create: `docs/design/fidelity-ledger.md`

**Interfaces:**
- Consumes: approved product design in `docs/superpowers/specs/2026-08-13-family-command-center-design.md`
- Produces: visual source of truth for the 375 × 812 Today screen and 1440 × 1000 desktop shell

- [ ] **Step 1: Generate the primary mobile concept**

Use Image Gen with a brief that explicitly includes all allowed above-the-fold copy:

```text
Create a production UI concept, 375x812 mobile, for a French family organizer named Maison.
Show the Aujourd'hui screen: top wordmark Maison, greeting "Bonjour Florian", date
"Jeudi 13 août", one calm chronological list with time, title, owner and category,
a compact shopping remainder only when items exist, bottom navigation Aujourd'hui,
Agenda, Courses, Maison, Enfants, a sage quick-add button, and a disabled microphone
control labeled Bientôt. Warm premium non-childish direction: very light ivory background,
midnight text, sage primary, restrained terracotta and soft blue for children. No charts,
stats, gradients, nested card grid, decorative illustration, emoji icons, or marketing copy.
All interactive UI text must remain code-native in implementation. Ensure 44px targets,
high contrast, generous spacing, and a ten-second reading experience.
```

- [ ] **Step 2: Generate the matching desktop and secondary-state concept**

Generate one 1440 × 1000 concept showing the compact left navigation, Today content width, and an open quick-add sheet. Preserve the exact mobile design system and copy hierarchy.

- [ ] **Step 3: Inspect and record design tokens**

Use `view_image` on both concepts and record exact approximate values in `docs/design/fidelity-ledger.md`:

```markdown
# Fidelity ledger

| Element | Concept evidence | Implementation target |
|---|---|---|
| Background | warm ivory | `--color-bg` sampled from concept |
| Primary text | midnight | `--color-ink` sampled from concept |
| Action | sage | `--color-primary` sampled from concept |
| Today density | one open timeline | no dashboard card grid |
| Mobile nav | five fixed destinations | 44px minimum targets |
| Type | warm sans, clear hierarchy | explicit size/weight/line-height tokens |
```

- [ ] **Step 4: Commit the locked concept**

```bash
git add docs/design
git commit -m "design: lock Family Command Center visual concept"
```

---

### Task 2: Scaffold the typed PWA and design system

**Files:**
- Create: `package.json`, `package-lock.json`, `tsconfig*.json`, `vite.config.ts`, `index.html`
- Create: `src/main.tsx`, `src/app/App.tsx`, `src/styles/tokens.css`, `src/styles/global.css`
- Create: `src/test/setup.ts`, `src/app/App.test.tsx`
- Create: `.env.example`, `.gitignore`

**Interfaces:**
- Consumes: concept tokens from Task 1
- Produces: `App(): JSX.Element`, Vitest environment, PWA build, global CSS variables

- [ ] **Step 1: Inspect current package versions and pin dependencies**

Run registry lookups for `react`, `react-dom`, `vite`, `typescript`, `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `react-router-dom`, `@tanstack/react-query`, `zod`, `date-fns`, `lucide-react`, `@supabase/supabase-js`, and `vite-plugin-pwa`. Write exact versions into `package.json` and commit `package-lock.json`.

- [ ] **Step 2: Write the failing application smoke test**

Create `src/app/App.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { App } from './App'

it('renders the French family home', () => {
  render(<App />)
  expect(screen.getByRole('heading', { name: /bonjour/i })).toBeInTheDocument()
  expect(screen.getByRole('navigation', { name: /navigation principale/i })).toBeInTheDocument()
})
```

- [ ] **Step 3: Verify the smoke test fails**

Run: `npm test -- --run src/app/App.test.tsx`  
Expected: failure because `App` and the test environment do not exist.

- [ ] **Step 4: Create the minimal typed application and test setup**

Create `src/app/App.tsx`:

```tsx
export function App() {
  return (
    <main>
      <h1>Bonjour Florian</h1>
      <nav aria-label="Navigation principale" />
    </main>
  )
}
```

Configure Vitest with jsdom and `@testing-library/jest-dom/vitest`. Add exact scripts `dev`, `build`, `lint`, `test`, `test:e2e`, and `preview`.

- [ ] **Step 5: Implement tokens from the accepted concept and PWA metadata**

Define at minimum:

```css
:root {
  --color-bg: #f7f5ef;
  --color-surface: #ffffff;
  --color-ink: #14242f;
  --color-muted: #68747a;
  --color-primary: #6e8978;
  --color-school: #c77c64;
  --color-nursery: #6f91a8;
  --radius-sm: 10px;
  --radius-md: 16px;
  --shadow-soft: 0 8px 28px rgb(20 36 47 / 8%);
  --tap-size: 44px;
}
```

Replace approximate colors with sampled concept values before commit. Configure the manifest name `Maison — Family Command Center`, standalone display, theme/background colors, and icons.

- [ ] **Step 6: Run unit test and production build**

Run: `npm test -- --run && npm run build`  
Expected: all tests pass and `dist/` contains the app shell and manifest.

- [ ] **Step 7: Commit the scaffold**

```bash
git add package.json package-lock.json tsconfig*.json vite.config.ts index.html .env.example .gitignore src public
git commit -m "feat: scaffold typed Family Command Center PWA"
```

---

### Task 3: Define domain contracts and tested read models

**Files:**
- Create: `src/types/domain.ts`
- Create: `src/repositories/contracts.ts`, `src/repositories/demoSeed.ts`, `src/repositories/demoRepository.ts`
- Create: `src/features/today/buildTodayFeed.ts`, `src/features/today/buildTodayFeed.test.ts`
- Create: `src/features/shopping/groupShoppingItems.ts`, `src/features/shopping/groupShoppingItems.test.ts`
- Create: `src/features/household/nextOccurrence.ts`, `src/features/household/nextOccurrence.test.ts`

**Interfaces:**
- Produces: `FamilyRepository`, `buildTodayFeed`, `groupShoppingItems`, `nextOccurrence`
- Produces types: `Event`, `ShoppingItem`, `HouseholdTask`, `ChildItem`, `HouseholdMember`, `TodayEntry`

- [ ] **Step 1: Define exact domain types**

Use discriminated unions and ISO timestamp strings:

```ts
export type Owner = 'florian' | 'partner' | 'family'
export type ChildSpace = 'school' | 'nursery'
export type ChildItemKind = 'event' | 'bring' | 'information'
export type ShoppingAisle = 'produce' | 'fresh' | 'grocery' | 'home' | 'baby' | 'other'
export type Recurrence = { unit: 'day' | 'week' | 'month'; interval: number } | null

export interface BaseEntity {
  id: string
  householdId: string
  createdBy: string
  createdAt: string
  updatedAt: string
}
```

Define entity fields exactly as specified by the design document and keep UI labels outside domain types.

- [ ] **Step 2: Write failing tests for the Today aggregation**

Cover these exact cases: event inside local day is included; tomorrow's event is excluded; due incomplete task is included; dated child `bring` item is included; undated `information` is excluded; completed entries sort last.

```ts
expect(buildTodayFeed(input, new Date('2026-08-13T12:00:00+02:00')).map(x => x.kind))
  .toEqual(['event', 'child', 'task'])
```

- [ ] **Step 3: Run the Today test and verify failure**

Run: `npm test -- --run src/features/today/buildTodayFeed.test.ts`  
Expected: failure because `buildTodayFeed` is missing.

- [ ] **Step 4: Implement `buildTodayFeed`**

Use `date-fns` `startOfDay`, `endOfDay`, `isWithinInterval`, and a stable sort by effective timestamp then completion. Never compare display strings.

- [ ] **Step 5: Write and run failing shopping grouping tests**

Assert fixed aisle order and exclusion of checked items from the active groups:

```ts
expect(groupShoppingItems(items).map(group => group.aisle))
  .toEqual(['produce', 'fresh', 'baby'])
```

- [ ] **Step 6: Implement `groupShoppingItems`**

Return `Array<{ aisle: ShoppingAisle; items: ShoppingItem[] }>` using the fixed order `produce`, `fresh`, `grocery`, `home`, `baby`, `other`.

- [ ] **Step 7: Write and run failing recurrence tests**

Cover daily interval 2, weekly interval 1, month-end Jan 31 → Feb last day, and null recurrence.

- [ ] **Step 8: Implement `nextOccurrence`**

Signature:

```ts
export function nextOccurrence(completedAt: Date, recurrence: Recurrence): Date | null
```

Use `addDays`, `addWeeks`, and a month-end-safe helper based on `lastDayOfMonth`.

- [ ] **Step 9: Implement demo repository persistence**

Define `FamilyRepository` with list/create/update/remove operations per entity and a `subscribe(listener): () => void` method. Store a versioned JSON document under `family-command-center:demo:v1`; validate loaded data and fall back to `demoSeed` on corrupt input.

- [ ] **Step 10: Run all domain tests and commit**

Run: `npm test -- --run`  
Expected: all domain and smoke tests pass.

```bash
git add src/types src/repositories src/features
git commit -m "feat: add family domain and demo data engine"
```

---

### Task 4: Build the responsive app shell and Today workflow

**Files:**
- Create: `src/app/AppShell.tsx`, `src/app/router.tsx`
- Create: `src/components/IconButton.tsx`, `src/components/AddSheet.tsx`, `src/components/EmptyState.tsx`, `src/components/ErrorState.tsx`
- Create: `src/features/today/TodayPage.tsx`, `src/features/today/Timeline.tsx`, `src/features/today/TodayPage.test.tsx`
- Modify: `src/app/App.tsx`, `src/styles/global.css`

**Interfaces:**
- Consumes: `FamilyRepository`, `buildTodayFeed`, concept tokens
- Produces: reusable navigation shell and `AddSheet` creation payloads

- [ ] **Step 1: Write the failing Today interaction test**

```tsx
it('adds a task from the quick-add sheet', async () => {
  renderApp({ route: '/', repository: createMemoryRepository() })
  await userEvent.click(screen.getByRole('button', { name: /ajouter/i }))
  await userEvent.click(screen.getByRole('tab', { name: /tâche/i }))
  await userEvent.type(screen.getByLabelText(/titre/i), 'Sortir les poubelles')
  await userEvent.click(screen.getByRole('button', { name: /enregistrer/i }))
  expect(await screen.findByText('Sortir les poubelles')).toBeVisible()
})
```

- [ ] **Step 2: Verify the Today interaction test fails**

Run: `npm test -- --run src/features/today/TodayPage.test.tsx`  
Expected: failure because the route, shell, and sheet are missing.

- [ ] **Step 3: Implement the app shell and routes**

Use semantic `nav`, active route state, five mobile destinations, compact desktop sidebar, and lazy route modules. At widths below 760 px use the fixed bottom bar; above it use the left rail.

- [ ] **Step 4: Implement Today from the accepted concept**

Render greeting/date, open timeline, completed disclosure, conditional shopping remainder, three quick-action shortcuts, and disabled microphone with `aria-describedby` pointing to `La saisie vocale arrivera prochainement`.

- [ ] **Step 5: Implement AddSheet with validation**

Use one visible required field first and a collapsed details region. The submitted discriminated payload is:

```ts
type QuickAddPayload =
  | { kind: 'event'; title: string; startsAt: string; owner: Owner }
  | { kind: 'task'; title: string; dueAt: string | null; owner: Owner }
  | { kind: 'shopping'; name: string; aisle: ShoppingAisle; quantity: string | null }
```

- [ ] **Step 6: Run Today tests and compare first viewport**

Run the app at 375 × 812 and 1440 × 1000. Capture screenshots and inspect the concept and implementation with `view_image`. Update `docs/design/fidelity-ledger.md` with at least copy, layout, typography, palette, spacing, icon, and responsive comparisons.

- [ ] **Step 7: Commit the shell and Today screen**

```bash
git add src/app src/components src/features/today src/styles docs/design/fidelity-ledger.md
git commit -m "feat: build calm Today experience"
```

---

### Task 5: Build Agenda, Courses, Maison, École and Crèche

**Files:**
- Create: `src/features/calendar/CalendarPage.tsx`, `EventForm.tsx`, `CalendarPage.test.tsx`
- Create: `src/features/shopping/ShoppingPage.tsx`, `ShoppingItemRow.tsx`, `ShoppingPage.test.tsx`
- Create: `src/features/household/HouseholdPage.tsx`, `TaskForm.tsx`, `HouseholdPage.test.tsx`
- Create: `src/features/children/ChildrenPage.tsx`, `ChildItemForm.tsx`, `ChildrenPage.test.tsx`
- Modify: `src/app/router.tsx`

**Interfaces:**
- Consumes: domain types and `FamilyRepository`
- Produces: route modules `/agenda`, `/courses`, `/maison`, `/enfants/ecole`, `/enfants/creche`

- [ ] **Step 1: Write failing route-level tests**

Create one focused test per feature:

```tsx
it('moves a checked shopping item to Pris', async () => {
  renderApp({ route: '/courses', repository: seededRepository })
  await userEvent.click(screen.getByRole('checkbox', { name: /compotes/i }))
  expect(screen.getByRole('region', { name: /pris/i })).toHaveTextContent('Compotes')
})
```

Agenda must create/edit an event; Maison must complete a recurring task and show the next occurrence; Enfants must switch École/Crèche and create an `À apporter` item.

- [ ] **Step 2: Verify all four feature tests fail**

Run: `npm test -- --run src/features/calendar src/features/shopping src/features/household src/features/children`  
Expected: route modules do not exist.

- [ ] **Step 3: Implement Agenda**

Default to chronological list with an optional compact week control. Keep title, time, owner, category, optional location and reminder. Use native date/time inputs with explicit French labels.

- [ ] **Step 4: Implement Courses**

Group open items by fixed aisle order, keep inline add focused on item name, move checked items into a collapsible `Pris`, and provide `Vider les articles pris` with confirmation.

- [ ] **Step 5: Implement Maison**

Provide `À faire` and `Terminées`, owner/date/priority filters, and recurrence fields. On completion, call `nextOccurrence` and create exactly one subsequent task when non-null.

- [ ] **Step 6: Implement Enfants**

Use École/Crèche tabs plus `À venir`, `À apporter`, and `Informations` sections. Dated `event` items also create/update a linked calendar event; undated information remains local to the child space.

- [ ] **Step 7: Run route-level and full unit tests**

Run: `npm test -- --run`  
Expected: all feature tests and existing tests pass.

- [ ] **Step 8: Commit all feature routes**

```bash
git add src/features src/app/router.tsx
git commit -m "feat: add shared family planning modules"
```

---

### Task 6: Create and verify the Supabase schema and household security

**Files:**
- Create: `supabase/config.toml`
- Create: `supabase/migrations/*_initial_schema.sql` using `supabase migration new initial_schema`
- Create: `supabase/tests/rls_households.test.sql`
- Create: `src/types/database.ts`

**Interfaces:**
- Produces: secured tables `households`, `household_members`, `events`, `shopping_items`, `tasks`, `child_items`, `reminders`
- Produces: realtime publication and generated TypeScript database types

- [ ] **Step 1: Re-check official Supabase changelog and docs**

Review current breaking changes for Auth, RLS, Realtime, CLI, publishable keys, and migrations. Confirm CLI commands with `supabase --help`, then run `--help` on each exact subcommand before using it.

- [ ] **Step 2: Create or select a Supabase project**

Use the connected Supabase tooling to list organizations and projects. If a new project has a cost, obtain the connector's cost confirmation before creation. Name the project `family-command-center` in the user's selected organization and region closest to France.

- [ ] **Step 3: Create the migration through supported tooling**

Generate the migration filename with `supabase migration new initial_schema`. Define UUID primary keys, foreign keys with explicit delete behavior, checks for all enums, UTC timestamps, and indexes on `(household_id, starts_at)`, `(household_id, due_at)`, and `(household_id, checked)`.

- [ ] **Step 4: Add RLS membership policies**

Enable RLS on every table. Create `public.is_household_member(target_household_id uuid)` as a stable `SECURITY INVOKER` SQL function and grant execution only to `authenticated`. Its body must use:

```sql
exists (
  select 1
  from public.household_members hm
  where hm.household_id = target_household_id
    and hm.user_id = (select auth.uid())
)
```

Create separate SELECT, INSERT, UPDATE, and DELETE policies `TO authenticated` on each business table using `public.is_household_member(household_id)`. INSERT/UPDATE checks must prevent changing `household_id` to a household where the caller is not a member. The `household_members` table uses direct `(select auth.uid()) = user_id` access for member reads. Household creation and invitation acceptance use narrowly scoped `SECURITY DEFINER` functions in a non-exposed `private` schema; each function checks `auth.uid() is not null`, fixes `search_path`, validates its arguments, and grants execute only to `authenticated`. Do not use `user_metadata`, `auth.role()`, or a public `SECURITY DEFINER` function.

- [ ] **Step 5: Enable Realtime and API grants**

Grant only required CRUD privileges to `authenticated`, revoke business-table access from `anon`, and add `events`, `shopping_items`, `tasks`, and `child_items` to `supabase_realtime`.

- [ ] **Step 6: Write adversarial RLS tests**

Create two users and two households in the SQL test transaction. Assert member A can CRUD household A; member A receives zero rows and cannot insert/update/delete household B; unauthenticated access returns zero rows.

- [ ] **Step 7: Apply, inspect, and verify**

Iterate with SQL execution, then run database advisors and fix security/performance findings. Generate clean migration history and TypeScript types only after tests pass. Verify migration list and table RLS state.

- [ ] **Step 8: Commit schema and generated types**

```bash
git add supabase src/types/database.ts
git commit -m "feat: secure household data with Supabase RLS"
```

---

### Task 7: Connect Auth, repositories, Realtime, and household onboarding

**Files:**
- Create: `src/lib/config.ts`, `src/lib/supabase.ts`, `src/lib/queryClient.ts`
- Create: `src/features/auth/AuthProvider.tsx`, `SignInPage.tsx`, `OnboardingPage.tsx`, `AuthProvider.test.tsx`
- Create: `src/repositories/supabaseRepository.ts`, `src/repositories/supabaseRepository.test.ts`
- Modify: `src/app/App.tsx`, `src/app/router.tsx`, `.env.example`

**Interfaces:**
- Consumes: generated `Database` types, publishable URL/key, `FamilyRepository`
- Produces: `useAuth()`, `useFamilyRepository()`, protected routes, household creation/join flow

- [ ] **Step 1: Write failing configuration and auth tests**

Assert no credentials selects demo mode; both URL and publishable key select connected mode; partial credentials produce a visible configuration error. Mock `signInWithPassword`, `signUp`, and auth state changes.

- [ ] **Step 2: Implement validated configuration**

Use Zod to read only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Never accept or document a service-role key.

- [ ] **Step 3: Implement auth and onboarding**

Provide sign in, sign up, sign out, password-reset request, create household, and accept invite token. Keep demo access as `Découvrir en mode démo` and visually label the resulting session `Démo`.

- [ ] **Step 4: Write failing repository mapping tests**

Mock Supabase responses and assert snake_case database rows map losslessly to camelCase domain objects, optimistic failure restores the prior cache, and subscription cleanup removes the Realtime channel.

- [ ] **Step 5: Implement `SupabaseFamilyRepository`**

Filter every business query by active `household_id` in addition to relying on RLS. Use TanStack Query invalidation on Realtime INSERT/UPDATE/DELETE events. Subscribe to each required table with a household filter where supported.

- [ ] **Step 6: Run auth and repository tests**

Run: `npm test -- --run src/features/auth src/repositories/supabaseRepository.test.ts`  
Expected: all connected-mode tests pass without real credentials.

- [ ] **Step 7: Verify two-user connected flow**

In two isolated browser contexts, sign in as two test accounts in one household. Add a shopping item in context A and verify it appears in B without reload. Attempt a direct request for another household and verify zero accessible rows.

- [ ] **Step 8: Commit connected mode**

```bash
git add src/lib src/features/auth src/repositories src/app .env.example
git commit -m "feat: add secure shared household sync"
```

---

### Task 8: Add reminders, installation polish, and full verification

**Files:**
- Create: `src/features/reminders/reminderService.ts`, `reminderService.test.ts`
- Create: `src/components/ConnectivityBanner.tsx`
- Create: `e2e/core-flow.spec.ts`, `playwright.config.ts`
- Modify: `src/app/App.tsx`, `README.md`, `docs/design/fidelity-ledger.md`

**Interfaces:**
- Consumes: browser Notification API and repository reminder records
- Produces: permission-safe local reminders, offline status, repeatable end-to-end QA

- [ ] **Step 1: Write failing reminder permission tests**

Cover unsupported API, `default`, `denied`, and `granted` states. Never call `Notification.requestPermission()` before an explicit user click.

- [ ] **Step 2: Implement reminder and connectivity behavior**

Show due reminders in Today regardless of notification permission. Add a non-blocking offline banner; restore it automatically on `online`. Do not promise that unsent connected-mode mutations are synchronized.

- [ ] **Step 3: Write the core Playwright flow**

In demo mode at 375 × 812:

```ts
test('family completes the daily core flow', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /ajouter/i }).click()
  await page.getByRole('tab', { name: /article/i }).click()
  await page.getByLabel(/article/i).fill('Tomates cerises')
  await page.getByRole('button', { name: /enregistrer/i }).click()
  await page.getByRole('link', { name: /courses/i }).click()
  await page.getByRole('checkbox', { name: /tomates cerises/i }).check()
  await expect(page.getByRole('region', { name: /pris/i })).toContainText('Tomates cerises')
})
```

- [ ] **Step 4: Run complete automated verification**

Run: `npm run lint && npm test -- --run && npm run build && npm run test:e2e`  
Expected: every command exits 0.

- [ ] **Step 5: Perform visual fidelity QA**

Use the available browser first; use Playwright only if the browser is unavailable or unreliable. Capture 375 × 812 and 1440 × 1000 screenshots. Inspect both accepted concepts and both implementations with `view_image`. Record at least five evidence-backed comparisons, fix every material mismatch, verify above-the-fold copy exactly, and state any intentional deviations.

- [ ] **Step 6: Perform accessibility and mobile QA**

Verify keyboard navigation, visible focus, labels, AA contrast, reduced motion, no horizontal overflow at 320/375/430 px, and 44px targets. Check every route's loading, empty, error, and session-expired state.

- [ ] **Step 7: Write operational README**

Document demo mode, local commands, Supabase environment names, database migration workflow, Vercel deployment, household invitation flow, privacy model, and the future speech-to-text extension boundary.

- [ ] **Step 8: Commit the verified release candidate**

```bash
git add src e2e playwright.config.ts README.md docs/design/fidelity-ledger.md
git commit -m "feat: finish installable Family Command Center v1"
```

---

### Task 9: Publish GitHub repository and deploy

**Files:**
- Modify only if verification discovers a deployment issue: `vite.config.ts`, `README.md`

**Interfaces:**
- Consumes: clean `main` branch, passing verification, connected GitHub account
- Produces: new GitHub repository and deployment-ready main branch

- [ ] **Step 1: Confirm repository status and GitHub identity**

Run `git status --short`, `git log --oneline --decorate -10`, and `gh auth status`. The working tree must be clean and all checks from Task 8 must have passed.

- [ ] **Step 2: Create and push the new repository**

Create `family-command-center` under Florian's connected GitHub account with description `Le quotidien familial, simplement.` and visibility `public` unless the account policy or user explicitly selects private. Add the origin and push `main`.

- [ ] **Step 3: Configure deployment without secrets in Git**

Deploy the frontend to Vercel. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in the deployment environment only. Configure Supabase Auth site URL and allowed redirect URLs to the deployed domain.

- [ ] **Step 4: Verify the deployed product**

Open the deployed URL in a fresh browser, install/check the PWA manifest, test sign-in, Today, quick-add, shopping completion, and real-time sync. Repeat a cross-household denial check.

- [ ] **Step 5: Tag and report release**

Create annotated tag `v1.0.0`, push it, and report the GitHub URL, deployed URL, Supabase project name, test summary, and any manual account-invite step remaining for the second parent.

---

## Self-review result

- Spec coverage: all fifteen design sections map to Tasks 1–9; speech-to-text remains an explicit extension boundary rather than an unimplemented V1 promise.
- Security: the plan includes membership-based RLS, adversarial cross-household tests, publishable-key-only frontend configuration, explicit grants, advisors, and Realtime publication.
- Type consistency: `Owner`, `ChildSpace`, `ShoppingAisle`, `Recurrence`, `QuickAddPayload`, and `FamilyRepository` are defined before their consumers.
- Visual verification: concept and implementation are both inspected at native mobile and desktop sizes, with a written fidelity ledger.
- No unresolved placeholders are intentionally left in the implementation plan.
