# Family Command Center — fidelity ledger

## Locked visual source of truth

| Surface | Concept | Native target | State |
|---|---|---:|---|
| Mobile | `docs/design/family-command-center-concept.png` | 375 × 812 | Aujourd'hui, populated shopping remainder, quick-add controls visible |
| Desktop | `docs/design/family-command-center-desktop-concept.png` | 1440 × 1000 | Aujourd'hui, compact left navigation, quick-add sheet open |

The accepted direction is **quotidien calme**: a warm, premium, non-childish family planner with one open chronological reading path. The timeline—not a dashboard, chart, card grid, or decorative illustration—is the visual idea. Mobile and desktop are two responsive expressions of the same component system.

## Design tokens

The generated raster concepts contain minor antialiasing and warm surface variation. The implementation must use the following single, flat token values so both breakpoints remain visually identical.

| Element | Concept evidence | Implementation target |
|---|---|---|
| Background | warm ivory, sampled around `#FAF6F3`–`#FCF8F6` | `--color-bg: #FCF8F5` |
| Primary text | deep midnight, sampled around `#030D32`–`#081946` | `--color-ink: #081946` |
| Secondary text | desaturated blue-gray; also the Famille semantic color | `--color-muted: #66728C`; `--color-family: #66728C` |
| Action | dark forest sage for active text, icons, and solid CTA fills | `--color-primary: #526E59` |
| Action hover | deeper forest sage | `--color-primary-strong: #465F4D` |
| School accent | deep accessible terracotta; École only | `--color-school: #A54934` |
| Child-care accent | deep accessible blue; Crèche only | `--color-child: #315AA6` |
| Hairline border | warm stone | `--color-border: #EAE3DD` |
| Raised/control surface | almost-white ivory | `--color-surface: #FFFCF9` |
| Disabled surface | quiet warm gray | `--color-disabled: #ECE9E6`; text `#919CA4` |
| Rare elevation | desktop sheet only; diffuse, low contrast | `--shadow-sheet: -8px 0 24px rgb(8 25 70 / 8%)` |
| Today density | one open timeline | no dashboard card grid; hairline row separators only |
| Mobile nav | five fixed destinations | 72px fixed rail; 44px minimum targets |
| Type | warm sans, clear hierarchy | `Manrope`, `Avenir Next`, system sans; explicit size/weight/line-height tokens |

### WCAG AA contrast verification

Contrast was calculated with the WCAG relative-luminance formula after sRGB linearization. Normal text requires at least 4.5:1. Every text-bearing semantic color passes against the locked ivory background, and white CTA text passes against both primary button states.

| Text-bearing color | Foreground | Background | Ratio | Result |
|---|---:|---:|---:|---|
| Primary ink | `#081946` | `#FCF8F5` | 16.06:1 | Pass |
| Muted / Famille | `#66728C` | `#FCF8F5` | 4.57:1 | Pass |
| Primary sage | `#526E59` | `#FCF8F5` | 5.33:1 | Pass |
| Primary sage hover | `#465F4D` | `#FCF8F5` | 6.62:1 | Pass |
| École terracotta | `#A54934` | `#FCF8F5` | 5.52:1 | Pass |
| Crèche blue | `#315AA6` | `#FCF8F5` | 6.33:1 | Pass |
| White CTA text | `#FFFFFF` | `#526E59` | 5.62:1 | Pass |
| White CTA hover text | `#FFFFFF` | `#465F4D` | 6.99:1 | Pass |

Terracotta is reserved for École and blue for Crèche. Famille always uses muted blue-gray, midnight, or sage; it never uses terracotta. Non-text decorative lines may use lighter tints, but no normal-size label may use a color below 4.5:1.

### Typography

Use tabular numerals for every time. Controls must not inherit browser defaults.

| Token | Mobile target | Desktop target |
|---|---|---|
| Wordmark | 26/32, 700 | 30/36, 700 |
| Greeting | 30/36, 500 | 42/50, 500 |
| Date | 16/24, 400 | 20/28, 400 |
| Timeline time | 16/24, 500, tabular | 20/28, 500, tabular |
| Timeline title | 16/24, 700 | 20/28, 700 |
| Row metadata | 12/18, 400 | 16/22, 400 |
| Control text | 13/18, 500 | 16/22, 500 |
| Mobile nav label | 10/14, 500 | n/a |
| Sidebar nav label | n/a | 18/24, 500 |
| Sheet heading | n/a | 26/32, 700 |

### Geometry and spacing

- Spacing scale: `4, 8, 12, 16, 20, 24, 32, 40, 56, 72px`.
- Mobile horizontal gutter: 20px. Desktop sidebar: 240px. Desktop quick-add sheet: 492px. Desktop Today reading column: max 648px inside the remaining shell.
- Open lists have no outer card. Timeline rows use generous vertical rhythm and a 1px warm-stone separator. The sage timeline is a 1–2px rule with open circular nodes.
- Field radius: 8px. Shortcut/control radius: 10px. Selected navigation background radius: 8px. Quick-add button radius: 999px.
- Minimum interactive target: 44 × 44px. Mobile primary add control is approximately 58px. Icons are 20–24px with an optically consistent 1.75px outline stroke.
- Borders are 1px. Shadows are prohibited except the open desktop sheet and the faint disabled microphone surface.

## Responsive composition lock

### Mobile — 375 × 812

1. Quiet wordmark, then greeting and date.
2. One open vertical timeline with four chronological rows.
3. Shopping remainder appears only while items remain.
4. Three compact quick-add shortcuts, then one sage add button and the disabled microphone control.
5. Fixed five-destination bottom navigation. `Aujourd'hui` is selected with sage icon/text and a thin top indicator.

There is no top-right add button. The only enabled primary add control is the sage circular button above the bottom navigation.

### Desktop — 1440 × 1000

1. A 240px compact left rail contains the Maison wordmark, the same five destinations, selected `Aujourd'hui`, and the disabled microphone near the bottom.
2. Today remains a bounded reading column; it does not expand into a dense dashboard.
3. The 492px right sheet occupies full viewport height. It is separated by one hairline and a rare soft shadow; it is not a centered floating card.
4. The same timeline, shopping remainder, and three shortcuts retain their mobile ordering and component anatomy.
5. Mobile bottom navigation and mobile floating add control are absent while the desktop sheet is open.

## Visible-copy lock

Do not add eyebrow text, status pills, metrics, marketing copy, extra navigation, or explanatory labels.

### Shared Today copy

- `Maison`
- `Bonjour Florian`
- `Jeudi 13 août`
- `08:10` / `Départ école` / `Florian` / `École`
- `12:30` / `Déjeuner avec Mamie` / `Famille` / `Famille`
- `16:30` / `Récupérer Jules` / `Florian` / `Crèche`
- `18:00` / `Sortir les poubelles` / `Maison` / `Maison`
- `Courses · 3 articles`
- `Lait`, `Pommes`, `Couches`, `Voir la liste`
- `Événement`, `Tâche`, `Article`
- `Aujourd'hui`, `Agenda`, `Courses`, `Maison`, `Enfants`
- `Bientôt`

### Desktop open-sheet copy

- `Ajouter`
- `Événement`, `Tâche`, `Article`
- `Titre` / `Déjeuner avec Mamie`
- `Date` / `13 août 2026`
- `Heure` / `12:30`
- `Responsable` / `Famille`
- `Plus de détails`
- `Annuler`, `Ajouter`

## Icon inventory

All icons are code-native SVGs, never emoji or raster crops. Use rounded line caps/joins and one coherent outline family.

| Location | Meaning | Treatment |
|---|---|---|
| Timeline rail | chronological node | open sage circle on thin sage line |
| Row owner | person / family / home | muted outline person, users, or home |
| Row category | school / family / crèche / home | deep-terracotta backpack, muted blue-gray heart, deep-blue baby face, dark-sage home |
| Shopping | courses | sage outline cart |
| Quick shortcuts | event / task / article | midnight outline calendar, checkbox, shopping bag |
| Primary add | create | white plus centered in solid sage circle |
| Disabled voice | future microphone | muted gray microphone in disabled circular surface; `Bientôt` below icon |
| Navigation | Today / Agenda / Courses / Maison / Enfants | calendar-outline, calendar-grid, cart, home, users; active Today in sage |
| Sheet | close / date / time / select / disclosure | midnight close and chevrons; sage date and clock field icons |

## Container and interaction rules

- Preserve open whitespace. Do not wrap the Today column, timeline, or shopping items in a giant card.
- Shopping is the only lightly separated content block and appears only with remaining items.
- The three shortcuts form one reusable control family. The selected sheet type is a restrained sage outline/surface state, not a pill.
- Desktop fields are full-width, 44px minimum height, warm-stone bordered, and almost-white ivory. Focus must add a visible sage ring without changing geometry.
- The desktop primary `Ajouter` control uses a completely flat `#526E59` fill with white text—no gradient, tonal shift, texture, gloss, or highlight.
- The microphone is visibly disabled and must not imply working speech-to-text.
- Motion, if added later, is limited to a 160–200ms sheet transition and subtle selected/focus feedback; honor `prefers-reduced-motion`.
- All app UI text and controls must be recreated in HTML/CSS/components. The PNG files are design references, never production UI assets.

## `view_image` inspection ledger

| Check | Mobile evidence | Desktop evidence | Locked result |
|---|---|---|---|
| Copy | all required French copy and accents visible; one `Bientôt` | all Today and open-sheet copy visible | use the visible-copy list above verbatim |
| Layout | greeting → timeline → shopping → shortcuts → actions → nav | rail + bounded Today column + full-height right sheet | no extra regions or dashboard expansion |
| Density/container model | one open timeline; shopping lightly separated; no nested cards | open timeline retained; sheet is the only major panel | no card-grid reinterpretation |
| Palette | ivory, midnight, dark sage, deep terracotta, deep blue; Famille is muted blue-gray | same semantic palette and visual temperature; CTA is flat sage | use the single AA-safe token set above |
| Typography | warm sans; clear greeting/time/title/metadata hierarchy | hierarchy scales up without becoming display-heavy | use explicit typography tokens everywhere |
| Icons | consistent linear icons; selected Today in sage | same icon metaphors and stroke character | code-native SVG; 1.75px optical stroke |
| Targets and controls | shortcuts/nav/FAB/micro read as 44px+ targets | tabs, fields, close, disclosure, and actions read as 44px+ | never reduce below 44 × 44px |
| Clipping | full 375 × 812 surface visible | full 1440 × 1000 shell and sheet visible | no primary content clipping or accidental wrapping |

The first mobile generation contained a second add control in the top-right header. That duplicate was removed in a targeted edit; the final locked mobile concept contains exactly one enabled sage add button. Fix Round 1 then darkened every text-bearing semantic accent to the AA-safe values above, moved Famille from terracotta to muted blue-gray, and flattened the desktop sage CTA. No material concept mismatch remains after final target-size inspection.

## Task 4 implementation comparison — 13 August 2026

The implementation was captured with Playwright Chromium at both native target sizes and inspected with `view_image` in the same QA pass as the accepted concepts.

| Comparison | Concept evidence | Render evidence | Fix / disposition |
|---|---|---|---|
| Copy | locked French greeting, date, four entries, shopping remainder, shortcuts, five destinations, and desktop sheet | all locked strings and accents render; no added default-state copy | kept copy code-native and verbatim; the submit's visible and accessible name are both `Ajouter` |
| Layout | 375px open reading path; 1440px split into 240px rail, bounded Today, 492px sheet | native captures preserve the same region order and desktop split | fixed shell at the 760px boundary and constrained the desktop reading column to 600px |
| Typography | warm sans with 30/36 mobile and 42/50 desktop greeting; tabular times | scale, line height, and hierarchy match; local Chromium falls through to system sans, which is slightly wider/heavier than the concept | explicit typography tokens and tabular numerals applied; remaining font-metric drift is documented rather than adding an unapproved network font |
| Palette | flat `#FCF8F5` ivory, midnight, sage, semantic terracotta/blue | capture uses the locked flat CSS variables with no gradients or overlays | semantic category colors and flat sage CTA/FAB applied from tokens |
| Spacing / container | open timeline, 20px mobile gutter, sparse separators, no dashboard cards | mobile and desktop keep open whitespace; shopping alone is lightly separated | removed outer containers and used hairlines only; sheet is the sole elevated panel |
| Icons | coherent rounded outline family at 1.75px optical stroke | Lucide metaphors match navigation, owners, shopping, quick add, voice, and sheet controls | normalized SVG stroke width globally and retained open CSS timeline nodes |
| Responsive behavior | fixed five-item bottom bar below 760px; compact left rail above | 375px shows the bottom bar and single FAB; 1440px shows the rail and full-height sheet with no mobile FAB | duplicate responsive controls are hidden at 760px; active state changes from top indicator to sidebar rail |
| Targets / accessibility | controls read as at least 44px; microphone clearly unavailable | shortcuts, nav, FAB, tabs, fields, close, and actions meet the target; microphone is disabled | connected `aria-describedby` to `La saisie vocale arrivera prochainement`; semantic nav, tablist, dialog, labels, and focus rings added |
| First-viewport clipping | all primary content visible at both native sizes | desktop content and sheet fit; the corrected 375 × 812 capture renders all four locked titles in full | the title content column now uses the available row width; no structural or text clipping remains |

## Task 4 Fix Round 1 — 13 August 2026

| Finding | Before | Correction | Native evidence |
|---|---|---|---|
| Mobile title clipping | two locked titles ended in ellipses at 375 × 812 | category metadata became an anchored secondary-row element, leaving the full 245px content column for titles; ellipsis clipping was removed | all four title elements measure `scrollWidth === clientWidth === 245px`, and `view_image` shows every locked title in full |
| Timeline separators | separate body/category borders began after the time column and could fragment | one row-level hairline now starts at the time column and spans to the right gutter | corrected capture matches the concept's continuous row dividers |
| Submit label | visible `Ajouter` was replaced in the accessibility tree by `Enregistrer` | removed the overriding label; visible and accessible names are both `Ajouter` | role query by exact `Ajouter` identifies the submit inside the dialog |
| Dialog focus | focus stayed on the obscured opener and could leave the modal | opening focuses `Titre`; Tab and Shift+Tab wrap within the dialog; Escape dismisses and cleanup restores the opener | focused user-event tests cover initial focus, both trap directions, Escape, and restoration |
| Paris time | local creation hardcoded UTC+02 year-round | the converter resolves the actual `Europe/Paris` long offset for the selected local day/time | literal tests prove 12:30 → `11:30Z` in January and `10:30Z` in August |

Fresh mobile implementation evidence: `/tmp/family-command-center-task4-mobile.png` at the accepted 375 × 812 native size. It was inspected with `view_image` immediately alongside `docs/design/family-command-center-concept.png`. No primary content clipping or fixable visual mismatch remains in Fix Round 1.

## Task 8 release-candidate fidelity pass — 13 August 2026

Fresh implementation captures were produced by Playwright Chromium at `/tmp/family-command-center-task8-mobile.png` (375 × 812) and `/tmp/family-command-center-task8-desktop.png` (1440 × 1000). Both accepted concepts and both captures were inspected with `view_image` at original resolution in the same pass.

| Comparison | Accepted concept | Task 8 render | Disposition |
|---|---|---|---|
| Above-fold copy | locked greeting, date, four timeline rows, shopping, shortcuts/navigation; desktop sheet labels | automated exact-text scan reported zero missing strings at both native sizes | no default reminder or connectivity copy appears; those regions are conditional |
| Composition | mobile reading path and fixed bottom bar; desktop 240px rail, bounded Today, 492px sheet | region order, widths, and responsive control substitution remain aligned | no material structural drift |
| Palette and surfaces | flat ivory, midnight, sage, semantic terracotta/blue; sheet is sole elevated panel | tokens and flat surfaces match; no new card grid or gradient | connectivity notice is fixed and conditional only while offline |
| Typography and density | warm sans hierarchy, tabular time, open whitespace | hierarchy, row rhythm, and tabular times are retained | system fallback remains slightly wider/heavier than the concept; no network font added |
| Icons and controls | coherent outline icons, one enabled mobile FAB, disabled microphone | Lucide family, timeline nodes, one FAB, disabled `Bientôt`, and flat desktop CTA retained | no raster UI assets or emoji introduced |
| Clipping / responsiveness | full target surfaces with titles and actions intact | native screenshots show no clipping; automated scan of six routes at 320/375/430px found zero document overflow or overflowing elements | 18 route/width cases checked |
| Accessibility geometry | 44px targets, labels, visible focus | automated scan found zero unnamed or undersized visible controls; dialog focus tests cover entry, wrapping, Escape, and restoration | corrected route-ready Playwright probes at 375/430 focus the visible named `Voir la liste` link with a solid 3px ring, never `body` |

Intentional deviations are the visible `Démo` badge in demo evidence, local system font metrics, and the visible sage focus ring on the desktop title field after opening the sheet through a real interaction. The e2e submit selector remains `Ajouter`, matching the accepted visible and accessible copy rather than the stale `Enregistrer` selector in the planning snippet.

### Task 8 Fix Round 1

The screenshot pair remains authoritative because the fix changes delivery bookkeeping, test readiness, and operational documentation only; no visual component or token changed. `/tmp/family-command-center-task8-qa.json` was updated with fresh, route-ready keyboard evidence: at both 375 × 812 and 430 × 812, Today first renders `Bonjour Florian` plus the visible mobile navigation, then a real Tab focuses the named `Voir la liste` link (`A`, visible, `outline-style: solid`, `outline-width: 3px`). This replaces the two premature `BODY` samples and closes the prior keyboard-QA limitation.

Reminder notifications now use household-scoped delivered IDs for the current browser session. A successful browser notification is marked only after construction; repeated renders and repository refreshes do not redeliver it, a different reminder still delivers once, and a constructor failure remains retryable. Reminder rows stay visible independently of notification permission or delivery state, so the accepted default screenshots and copy remain unchanged.

### Task 8 final review fix

The accepted screenshots remain authoritative: the fix changes reminder lifecycle bookkeeping and lazy-route test synchronization, with no steady-state token, copy, geometry, or component-layout change. The Today Suspense boundary now exposes a transient named `Chargement…` status instead of an empty region, then resolves to the same accepted page.

Reminder delivery is occurrence-scoped by household, reminder id, and `reminderAt`. Recently due reminders remain visible regardless of notification permission, while an inclusive 24-hour grace window prevents historical events from accumulating in the Today surface or being replayed as notifications. Editing `reminderAt` produces one new eligible occurrence; exact rerenders remain deduplicated for the browser session. This conditional behavior does not alter the locked default-state screenshot pair.
