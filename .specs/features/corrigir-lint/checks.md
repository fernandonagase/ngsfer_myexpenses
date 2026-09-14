# Corrigir lint checks

Profile: light
Plan: none - change under the escape hatch (one-line script fix, no one-way door)

## Intent

`pnpm run lint` (or `pnpm lint`) at the repository root fails today with
`ERR_PNPM_NO_SCRIPT Missing script: "lint"`, because the root `package.json` mirrors `dev` /
`build` / `test` as `pnpm -r <script>` passthroughs but never added `lint`. `apps/capacitor` has
always had a working `lint` script (`eslint -c ./eslint.config.js ...`) and its rules are
already clean - confirmed by running it directly with `.quasar` generated (`pnpm --dir
apps/capacitor run lint` -> 0 problems). So the actual defect is the missing root passthrough,
not a rule violation in the source. (An initial run of ESLint directly against a copy of the
worktree source with no `.quasar/tsconfig.json` present printed 29 spurious `@typescript-
eslint/*` errors, because every `src/*` path-aliased import resolves to TS's `error` type
without that generated tsconfig; those errors are an artifact of an unprepared checkout, not of
the code, and disappear once `.quasar/tsconfig.json` exists - as it does in any environment
where `pnpm install` has run its `postinstall: quasar prepare` step.)

After this fix, a user running `pnpm lint` from the repo root gets the real ESLint result
instead of a pnpm "missing script" failure.

1 check in 1 slice · 0 one-way doors · 0 open

## Checks

### S1 - root lint passthrough · 1 file · <1 KB · ~1k

**C1** - `pnpm run lint` at the repo root no longer fails with `ERR_PNPM_NO_SCRIPT`; it delegates
to `apps/capacitor`'s ESLint run and exits 0
Proof: `pnpm run lint` (repo root)

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| root package.json scripts missing an existing sub-package equivalent (1) | `lint` C1 | - |

## Swept

- validation: n/a - no input validation touched
- failure modes: C1 (the failure mode fixed is the missing-script error itself)
- idempotency: n/a - running the script twice is a no-op either way
- authorization: n/a - no auth code touched
- concurrency: n/a - no concurrent code touched
- data lifecycle: n/a - no persisted data touched
- dependency failure: n/a - no dependency call touched
- state transitions: n/a - no state machine touched
- observability: n/a - no logging requirement in this slice

## Out of scope

- Adding a `lint` script to `packages/utils` - it has no ESLint config of its own; `pnpm -r lint`
  already skips workspace packages that don't declare the script (verified: `pnpm -r build`
  reports "Scope: 2 of 3 workspace projects" because `packages/utils` has no `build` script
  either).
- Any ESLint rule or config change - there were none to fix once resolution was correct.

## Handoff

Single slice, ~1k tokens, one builder, no handoff.

- **Boundary:** C1 closed at this session's commit
- **Settled mid-build:** the initial 29-error reading was a false lead from linting an
  unprepared worktree checkout (no `.quasar/tsconfig.json`); re-verified against a prepared
  checkout before writing any code fix
- **Abandoned:** renaming `packages/utils/src/currency.js` to `.ts` to chase a `BRL` type
  hypothesis - tried, made no difference to the (spurious) error count, reverted
