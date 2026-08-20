# Task 8 report — reminders, install polish, and release verification

## Result

Implemented permission-safe local reminders, due-reminder visibility independent of browser permission, a non-blocking connectivity banner, the mobile core Playwright flow, operational deployment/setup documentation, and release-candidate responsive QA.

## TDD evidence

### Reminder permission and connectivity RED

Before the requested modules existed:

```text
npm test -- --run src/features/reminders/reminderService.test.ts src/components/ConnectivityBanner.test.tsx

Test Files  2 failed (2)
Failed to resolve ./reminderService and ./ConnectivityBanner
exit 1
```

The permission tests independently cover unsupported, `default`, `denied`, and `granted`. The default branch proves delivery does not call `requestPermission`; only `requestReminderPermissionFromUserGesture` may do so. Denied/unsupported records remain returned by `getDueReminders`; granted delivery sends only records at or before `now`.

Focused GREEN:

```text
npm test -- --run src/features/reminders/reminderService.test.ts src/components/ConnectivityBanner.test.tsx

Test Files  2 passed (2)
Tests       5 passed (5)
exit 0
```

### Integrated Today/offline RED → GREEN

The next RED added a tomorrow event whose reminder was already due and an App-level offline event. It failed because `Rappels` and the global status region were absent (`2 failed | 4 passed`). After integration, the focused reminder, banner, Today, and App command passed `4` files and `11` tests. The Today assertion proves the reminder title is visible before notification permission is requested, then proves the request happens once after clicking `Activer les notifications`.

### Core-flow RED → GREEN

The Playwright flow first reached the connected sign-in state inherited from the environment; it was made repeatable by entering demo when necessary and unsetting both Vite Supabase variables in the web server. The next meaningful RED timed out on `getByLabel(/article/i)` because the quick-add field was still labelled `Titre`. The minimal fix gives the shopping variant the visible/accessible label `Article` while retaining locked `Titre` copy for events/tasks. Final focused e2e: `1 passed`.

Core path:

```text
/ → explicit demo entry when connected env is present → Ajouter → Article
→ fill “Tomates cerises” → Ajouter → Courses → check item
→ “Pris” region contains “Tomates cerises”
```

The submit uses `Ajouter`, not the stale `Enregistrer` planning selector, because the accepted concept and Task 4 accessibility lock require visible and accessible name parity.

## Reminder and connectivity behavior

- `Notification.requestPermission()` is never called during render, load, or delivery.
- Notifications are created only when permission is already `granted`.
- Due event reminders are rendered in Today even for a future event and regardless of unsupported/denied/default permission.
- The permission CTA exists only when a due reminder exists and permission is `default`, so accepted default-state copy is unchanged.
- Offline status listens to browser `offline`/`online`, disappears automatically on recovery, does not block interaction, and explicitly states connected changes are not sent; it does not promise a durable sync queue.

## Browser, screenshot, and `view_image` evidence

- Browser skill was initialized first. Its cloud Chrome was policy-denied access to `http://127.0.0.1:4173`; no circumvention was attempted.
- Playwright's official browser install retried five times, but the allowed CDN returned empty/truncated archives (`End of central directory record signature not found`).
- QA fallback: `@sparticuz/chromium@149.0.0` installed with `--no-save`, its browser-only archive extracted to `/tmp/chromium`, and Playwright launched through `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`. No package or lockfile change resulted.
- Native evidence: `/tmp/family-command-center-task8-mobile.png` (375 × 812), `/tmp/family-command-center-task8-desktop.png` (1440 × 1000), and `/tmp/family-command-center-task8-qa.json`.
- `view_image` inspected concept mobile → render mobile → concept desktop → render desktop at original resolution in one pass.
- Exact visible-copy scan reported zero missing locked strings at both native sizes; browser console/page-error collection was empty.

The fidelity ledger records seven evidence-backed comparisons. Material layout, copy, palette, icon, clipping, and target drift was not observed. Intentional differences: the required demo badge, local system font metrics, and the desktop field's real focus ring.

## Responsive and accessibility QA

Automated demo-route scan covered `/`, `/agenda`, `/courses`, `/maison`, `/enfants/ecole`, and `/enfants/creche` at 320, 375, and 430px: 18 cases, zero document overflow, zero overflowing visible elements, zero unnamed controls, zero controls below 44px under the scan's checkbox-label exception, and zero console errors. Existing route tests exercise loading/error/empty and mutation retry surfaces; auth tests cover protected/session-less redirects and onboarding/invitation states.

The original route scan had two Today `Tab` samples at 375/430 that ran before the lazy route mounted and left focus on `body`. Fix Round 1 replaces those samples with route-ready evidence described below. Component tests also cover visible dialog focus, both Tab directions, Escape, and focus restoration, and CSS supplies a 3px `:focus-visible` ring with reduced-motion support.

## Documentation

`README.md` documents demo behavior, local commands, only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`, linked/local migration workflows, pgTAP, Vercel setup, Auth redirect URLs, secure single-use invitation flow, RLS/privacy boundaries, offline limitations, notification permission, and the future replaceable speech-to-text boundary. It contains no actual key or service-role guidance.

## Final verification

Fresh final chain:

```text
env PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/tmp/chromium sh -c \
  'npm run lint && npm test -- --run && npm run build && npm run test:e2e'

lint: exit 0
Vitest: 16 passed files, 82 passed tests, exit 0
build: TypeScript + Vite/PWA succeeded, exit 0
e2e: 1 passed, exit 0
```

The immediately preceding chain found one TypeScript-only test-double widening error in `reminderService.test.ts`; typing the fake return as `Promise<NotificationPermission>` fixed the source, and the complete fresh chain above then passed. Vite reports a non-blocking main chunk size warning. `git diff --check` exits 0.

## Files

Created: reminder service/tests, connectivity banner/tests, Playwright config/core flow, README, this report.

Modified: App integration/tests, Today reminder UI/tests, AddSheet shopping label, global styles, Vitest e2e exclusion, and fidelity ledger.

## Fix Round 1 — session delivery, route-ready keyboard QA, and clean checkout

### Notification deduplication RED → GREEN

New regressions were written before production changes. The focused RED command was:

```text
npm test -- --run src/features/reminders/reminderService.test.ts src/features/today/TodayPage.test.tsx

Test Files  2 failed (2)
Tests       3 failed | 6 passed
```

The real failure signals were: repeated service delivery returned `1` rather than `0`; a throwing Notification constructor escaped; and Today rerender plus unrelated sheet open/close produced four notifications instead of one. After fixing one ambiguous test-only `Fermer` locator and rerunning RED, the same three behavioral failures remained.

Implementation uses a module registry backed by `sessionStorage` under `family-command-center.delivered-reminders.v1`. Keys are `${householdId}:${reminderId}` (with `local` fallback), so connected household changes cannot collide. The service checks the registry before constructing and marks only after `show` returns successfully. Storage failures fall back to the module Set; constructor failures return zero and stay retryable. Today also stabilizes its default `now` and memoizes the due-reminder list.

Focused GREEN:

```text
npm test -- --run src/features/reminders/reminderService.test.ts src/features/today/TodayPage.test.tsx

Test Files  2 passed (2)
Tests       9 passed (9)
```

The integration regression proves one notification across rerender, sheet open/close, and a repository title refresh; a second due reminder delivers once. The service regressions prove same-ID dedupe within a household, independent delivery in another household, retry after construction failure, and zero delivery when permission is denied. Due reminders remain rendered throughout.

### Route-ready keyboard evidence

The e2e helper now waits for network idle, optional demo entry, the visible `Bonjour Florian` heading, and visible mobile `Navigation principale` before any interaction. A dedicated test sets 375 × 812 and 430 × 812, presses real Tab, and asserts the active element is not `BODY`, is visible and named, and has a non-`none` focus outline.

Focused result with `/tmp/chromium` fallback: `2 passed`. The attached JSON decoded to the same result at both widths: `A`, `Voir la liste`, visible `true`, `outlineStyle: solid`, `outlineWidth: 3px`. `/tmp/family-command-center-task8-qa.json` replaces the two stale BODY samples with this route-ready evidence.

### Clean-checkout e2e operation

README now puts `npx playwright install chromium` before `npm run test:e2e`, documents `npx playwright install --with-deps chromium` for Linux system libraries, and identifies `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` as a diagnostic fallback only. Playwright uses its managed browser by default. `reuseExistingServer` is `false`; the runner always starts the explicit environment-scrubbed demo server and cannot silently reuse a connected server on the port.

Generated `test-results/`, `playwright-report/`, trace, and temporary keyboard-run artifacts are removed after verification. The final native screenshots and updated `/tmp/family-command-center-task8-qa.json` remain as the report/ledger evidence.

Fresh final Fix Round 1 gate:

```text
env PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/tmp/chromium sh -c \
  'npm run lint && npm test -- --run && npm run build && npm run test:e2e'

lint: exit 0
Vitest: 16 passed files, 85 passed tests, exit 0
build: TypeScript + Vite/PWA succeeded, exit 0
e2e: 2 passed (core flow + route-ready keyboard QA), exit 0
```

Vite retains the documented non-blocking main-chunk size warning; there are no package/lockfile changes from the temporary fallback browser.

## Final review fix — deterministic Today loading and bounded reminder occurrences

### Lazy route RED → GREEN

The standalone/full-suite flake was reproduced as a real synchronization defect: the lazy Today import could finish outside React `act`, and the route tests used process-wide `vi.dynamicImportSettled()` as a bare prerequisite. Repeated targeted baselines happened to pass, but every pass emitted React's “suspended resource finished loading ... not wrapped in act” warning; the slower runs occasionally left the named Today heading absent.

The RED added an assertion for an explicit lazy-route status and removed the unsafe global wait. The focused run failed four tests: the loading status did not exist, a Today heading never mounted, an edited reminder occurrence was suppressed, and an older-than-window reminder remained due (`4 failed | 9 passed`). Adding the status exposed rather than concealed a broken lazy import; a diagnostic GREEN attempt still failed on the missing heading while the fallback remained visible.

The final route test helper wraps `vi.dynamicImportSettled()` in async `act`, then waits for observable route output and loaded repository content. `App.test.tsx` owns the lazy-router contract, while the Today feature test renders `TodayPage` directly and waits on its visible heading. The production Suspense boundary has a named, visible `Chargement…` status rather than a null fallback.

Stress evidence:

```text
8 consecutive focused runs:
  src/app/App.test.tsx
  src/features/today/TodayPage.test.tsx
  src/features/reminders/reminderService.test.ts

each: 3 files passed, 16 tests passed
React lazy/act warnings: 0

3 consecutive full Vitest runs:
each: 16 files passed, 89 tests passed
React lazy/act warnings: 0
```

### Reminder occurrence and history RED → GREEN

The delivery identity is now `householdId | reminderId | reminderAt`, stored under the versioned session key `family-command-center.delivered-reminders.v2`. Changing an event's reminder time therefore creates a distinct occurrence that can notify once; rerenders of that exact occurrence remain deduplicated. Failed browser notification construction is still not marked delivered.

Both visible due reminders and notification delivery use an inclusive 24-hour grace window (`now - 24 h` through `now`). This keeps a recently missed reminder useful without retaining and replaying the household's full historical reminder backlog. The session registry prunes occurrence keys older than the same boundary before reading or persisting current delivery state. Regressions cover the edited time, repeat suppression of the edited occurrence, the exact 24-hour boundary, exclusion from both visibility and delivery one millisecond beyond it, and expired registry-key removal.

### Verification

The focused implementation run passed `3` files / `16` tests. Eight focused repetitions and three full-suite repetitions then passed without the former React warning. A first final build attempt stopped on an unrelated in-progress Supabase test fixture missing newly introduced recurrence fields; after its owner completed that fixture, the fresh complete gate passed:

```text
env PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/tmp/chromium sh -c \
  'npm run lint && npm test -- --run && npm run build && npm run test:e2e'

lint: exit 0
Vitest: 16 passed files, 89 passed tests, exit 0
build: TypeScript + Vite/PWA succeeded, exit 0
e2e: 2 passed (core flow + route-ready keyboard QA), exit 0
```

The existing Vite main-chunk advisory and npm proxy/new-version notices remain non-blocking. Playwright used the previously documented `/tmp/chromium` fallback; the package manifest and lockfile were not changed.

No visual token or steady-state component layout changed. The authoritative native Task 8 screenshot pair remains valid; only the transient Today route loading status is new. Supabase migrations and Household recurrence were not modified as part of this fix.
