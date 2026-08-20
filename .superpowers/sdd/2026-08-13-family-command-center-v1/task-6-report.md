# Task 6 reviewer report — Supabase schema and household security

## Verdict

**CHANGES_REQUESTED** for one load-bearing product-flow gap. The static security posture is otherwise strong: no confirmed cross-household or anonymous data-access vulnerability survived review.

Live apply, pgTAP execution, migration inspection, generated remote types, Realtime verification, and database advisors remain **⚠️ NEEDS_CONTEXT**, exactly as the implementation report states. No live result is inferred from grammar parsing or application tests.

## Load-bearing finding

### Major — Authenticated household lifecycle functions are unreachable through the configured Data API

`supabase/config.toml:13` exposes only `public` and `graphql_public`. The two authenticated entry points are created only as `private.create_household(...)` and `private.accept_household_invitation(...)` (`supabase/migrations/20260813133309_initial_schema.sql:319` and `:371`). Granting `authenticated` schema usage and function execution at `:451-453` does not make a non-exposed schema callable through PostgREST/Supabase RPC.

Impact: an authenticated browser client cannot execute either the only permitted household bootstrap path or invitation acceptance path. Direct table writes cannot compensate: household insertion requires pre-existing membership, while membership writes are intentionally ungranted. The pgTAP suite calls the private functions directly over SQL, so it does not exercise the product's Data API boundary.

Required fix: retain the fixed-search-path private `SECURITY DEFINER` implementations, but provide a callable exposed entry point without creating a public `SECURITY DEFINER` function—for example, carefully scoped public `SECURITY INVOKER` wrappers that delegate to the private functions, with PUBLIC/anon execution revoked and authenticated-only execution granted. Add an API-boundary test or documented equivalent proving authenticated reachability and anonymous denial.

This is a completeness/integration blocker, not an authorization bypass.

## Security disposition

No reportable security finding was confirmed in the reviewed diff.

- All seven exposed public tables enable RLS.
- Public-table privileges are explicitly revoked from `anon`; `authenticated` receives only the stated CRUD/SELECT grants.
- Authorization relies on `auth.uid()`, not `user_metadata` or `auth.role()`.
- Every exposed UPDATE policy has both `USING` and `WITH CHECK`; INSERT checks bind rows to a household the caller belongs to.
- `public.is_household_member` is `STABLE`, `SECURITY INVOKER`, fixed-search-path, and not executable by PUBLIC/anon.
- Both privileged implementations are in `private`, use `SECURITY DEFINER` with `search_path = ''`, check `auth.uid()`, validate arguments, revoke PUBLIC/anon, and grant execution only to `authenticated`.
- Invitation acceptance locks the invitation row, verifies authenticated-user email, expiry, and one-time state, and fixes the membership role to `member`.
- Composite household/source foreign keys prevent cross-household child-event and reminder links.
- Realtime publication includes `events`, `shopping_items`, `tasks`, and `child_items`.
- `src/types/database.ts` matches the public schema statically, including nullable `child_items.linked_event_id` and its composite relationship.

## Concise quality notes

- **Minor — adversarial coverage is narrower than the brief's wording.** Cross-household SELECT/INSERT/UPDATE/DELETE is exercised comprehensively only for `events`; the other business tables receive same-household CRUD coverage but not equivalent household-B attempts. `anon` is tested only for SELECT permission denial, not INSERT/UPDATE/DELETE. Extend the matrix across each exposed CRUD grant so future policy drift cannot hide behind the repeated current pattern.
- **Minor — SQL-level tests do not prove role exposure or RPC reachability.** Add catalog/API assertions for exact grants, function privileges/schema exposure, RLS flags, policy commands/checks, and publication membership.
- **Minor — invitation identity is caller-selected.** `member_owner` is validated against the enum but is not bound by the invitation. If `owner = florian|partner` is security- or identity-significant rather than presentation metadata, assign it when issuing the invitation and consume that stored value during acceptance.

## Readiness

After fixing the exposed-entry-point gap, the migration is statically ready for an isolated authorized Supabase project. Final acceptance still requires the honestly documented live steps: apply migration, run all pgTAP assertions, inspect RLS/grants/publication/migration history, run security and performance advisors, and generate/compare database types from the applied schema.

## Fix Round 1 — exposed household lifecycle RPCs

The load-bearing browser RPC gap and the three test/identity quality notes were addressed without changing a live project.

### Implementation

- Added exposed `public.create_household(household_name text, creator_display_name text, creator_owner text)` and `public.accept_household_invitation(invitation_token uuid, member_display_name text)` functions.
- Both public functions are fixed-empty-path `SECURITY INVOKER` wrappers. They perform no direct writes and delegate only to their exact private implementation; neither accepts a user ID, email, household ID, role, or arbitrary relation/function parameter.
- PUBLIC and `anon` execution is explicitly revoked from both wrappers; execution is granted only to `authenticated`.
- The private fixed-path `SECURITY DEFINER` implementations remain the only RLS-bypassing layer and continue to reject a null `auth.uid()` and invalid arguments.
- Invitation acceptance now compares the invitation email with the signed authenticated JWT `email` claim. No caller-supplied email or user identity is accepted.
- `private.household_invitations.invited_owner` binds the `florian`/`partner` identity at invitation issuance. Acceptance no longer accepts `member_owner`; it consumes the issuer-bound value and still fixes the authorization role to `member`.
- Updated `Database['public']['Functions']` types with the two stable public RPC signatures.

### RED/GREEN evidence

RED was captured after adding the new catalog/behavior test contract but before production SQL. Static declaration verification exited 1 with:

```text
public wrapper declarations: 0; expected: 2
```

After implementation, static declaration verification found both wrappers. The executable pgTAP suite now declares 67 assertions, up from 37. New assertions cover:

- exact public/private function schemas, stable signatures, invoker/definer flags, and fixed search paths;
- `pg_proc.proacl`/effective execute checks proving authenticated-only execution and no PUBLIC/anon execution;
- authenticated behavior through the exposed public wrappers rather than direct private calls;
- JWT email mismatch, invitation replay denial, and issuer-bound owner identity;
- cross-household SELECT/INSERT/UPDATE/DELETE for shopping items, tasks, child items, and reminders in addition to events;
- anon SELECT/INSERT/UPDATE/DELETE and both RPC denials.

Database GREEN is not claimed: the task explicitly prohibited live application, and no local database runtime is available or was started. The pgTAP suite remains ready to execute after the project/cost decision recorded earlier.

### Fix Round 1 verification

- PostgreSQL 17 grammar parsing with `libpg-query`: migration and pgTAP SQL both passed.
- Static security checks: 67 assertions, two public wrappers, exactly two private definers and three public invokers, no `user_metadata`/`auth.role()` authorization, JWT email binding and invitation-bound owner present.
- Application tests: 11 files and 53 tests passed.
- `npm run lint`: exited 0.
- `npm run build`: TypeScript check and Vite production build exited 0.
- Live migration, pgTAP execution, generated remote types, migration/RLS/publication inspection, and security/performance advisors remain **NEEDS_CONTEXT** and were not run.

## Fix Round 2 — authoritative current invitation email

Fix Round 2 supersedes Fix Round 1's JWT-email authorization statement while preserving the public-wrapper design and all prior evidence.

### Implementation

- The authenticated JWT is used only to resolve the session user through `auth.uid()`.
- The private fixed-path `SECURITY DEFINER` acceptance function now selects `lower(auth.users.email)` by that `caller_id` and compares the current Auth record with `private.household_invitations.invited_email`.
- The RPC still accepts no caller-selected email, user ID, household ID, member owner, or authorization role.
- A stale JWT email therefore cannot authorize acceptance after the Auth user's current email changes.

### RED/GREEN evidence

The regression was written before the production change. It changes `auth.users.email` while retaining the previously invited email in the JWT and expects the public wrapper to reject; it then restores the matching current Auth email and expects the same invitation to be accepted.

Static RED exited 1 against the prior implementation:

```text
383:  caller_email text := lower(nullif(auth.jwt() ->> 'email', ''));
RED: invitation acceptance still authorizes with stale JWT email
```

After the fix, both SQL artifacts parse under PostgreSQL 17 grammar, the migration contains the authoritative `auth.users` lookup by `caller_id`, and no email authorization uses `auth.jwt()`.

### Additional catalog and configuration coverage

The executable pgTAP suite now declares 73 assertions. In addition to the Round 1 matrix it checks:

- the exact authenticated table-privilege matrix, including SELECT-only membership access and no TRUNCATE/REFERENCES/TRIGGER grants;
- zero anon privileges on every public application table;
- RLS enabled on all seven public tables and the private invitation table;
- the exact SELECT/INSERT/UPDATE/DELETE policy-command matrix (with membership SELECT only);
- membership of `events`, `shopping_items`, `tasks`, and `child_items` in `supabase_realtime`;
- stale-JWT/current-Auth-email mismatch denial followed by successful acceptance when the current email matches.

Static configuration verification confirms only `public` and `graphql_public` are exposed in `supabase/config.toml`; `private` remains unexposed.

### Fix Round 2 live limitation

No local or live database was started, linked, queried, or changed. Database execution of the 73 pgTAP assertions, migration inspection, remote type generation, Realtime inspection, and security/performance advisors remain **NEEDS_CONTEXT** pending the project/cost decision already recorded.

## Fix Round 3 — exact hosted authenticated table privileges

The controller applied the earlier migration to a hosted Supabase project and ran the 73-assertion pgTAP suite. Live RED was `1/73`: assertion 9, `authenticated has the exact intended public-table privilege matrix`, failed because pre-existing/default hosted grants still included `TRUNCATE`, `REFERENCES`, and `TRIGGER` on all seven public application tables. `household_members` also retained write/administrative privileges beyond its intended SELECT-only contract.

Migration history was preserved. The already-applied initial migration was not rewritten. A new migration was generated with the supported CLI command:

```text
supabase migration new tighten_authenticated_table_privileges
```

Generated file: `supabase/migrations/20260813154211_tighten_authenticated_table_privileges.sql`.

The additive migration:

1. revokes all table privileges on the seven public application tables from `authenticated`;
2. re-grants CRUD on `households`;
3. re-grants SELECT only on `household_members`;
4. re-grants CRUD on `events`, `shopping_items`, `tasks`, `child_items`, and `reminders`;
5. does not revoke, grant, or otherwise change `service_role`.

The existing assertion 9 remains authoritative and test-first: it checks SELECT/INSERT/UPDATE/DELETE individually and rejects authenticated TRUNCATE/REFERENCES/TRIGGER privileges. The controller must apply the new migration and rerun all 73 assertions to establish live GREEN; no live database was changed in this fix turn.

### Fix Round 3 local/static verification

- The new migration passes PostgreSQL 17 grammar parsing with `libpg-query`.
- Static checks confirm one authenticated ALL-privilege revoke, the exact intended re-grant matrix, and no `service_role` statement in the new migration.
- The original and new migration plus pgTAP SQL parse in migration order.
- Application tests, lint, and production build remain part of the final verification gate before commit.

## Fix Round 4 — hosted foreign-key advisor indexes

The controller's hosted performance advisor identified nine foreign keys without covering btree indexes. Migration history remains additive: a new file was generated through the supported CLI command `supabase migration new index_foreign_keys` at `supabase/migrations/20260813154656_index_foreign_keys.sql`.

The migration adds exactly these indexes:

- partial `private.household_invitations (accepted_by) where accepted_by is not null`;
- `private.household_invitations (invited_by)`;
- `public.child_items (created_by)`;
- `public.events (created_by)`;
- `public.household_members (created_by)`;
- `public.households (created_by)`;
- `public.reminders (created_by)`;
- `public.shopping_items (created_by)`;
- `public.tasks (created_by)`.

The existing `private.household_invitations (household_id)` index is deliberately retained. An empty/fresh database can report it as unused before production traffic, but it covers the household foreign key and expected invitation-management access path.

The security advisor INFO for `private.household_invitations` having RLS enabled with no policies is intentional. The table is in an unexposed `private` schema, direct PUBLIC/anon/authenticated table grants are revoked, and access occurs only inside narrowly scoped fixed-path private `SECURITY DEFINER` functions reached through authenticated-only public invoker wrappers. Adding a permissive RLS policy would weaken that boundary, so no policy was added.

No live migration was applied in this fix turn. The controller must apply the additive migration and rerun performance/security advisors to establish live resolution.
