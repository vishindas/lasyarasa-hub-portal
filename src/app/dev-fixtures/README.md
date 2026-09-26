# dev-fixtures — verification-only, never shipped

Everything in this directory (plus `src/main.verify.ts` at the project
root) exists solely to let Slice 6's curriculum screens be browser-tested
locally without a staging backend and without touching production. It is
reached only from `src/main.verify.ts`, which is reached only from the
`verify` build/serve configurations in `angular.json` — the default and
`production` configurations both still build from `src/main.ts`, which
never imports anything under this directory. A production build's esbuild
graph has no path to this code; it cannot end up in a shipped bundle.

## Running it

```
ng serve --configuration verify
```

Opens the app already "logged in" (a fake token seeded into localStorage,
never sent anywhere real) with every `/api/` request answered by
`curriculum-fixture.interceptor.ts` from the static data in
`curriculum-fixture-data.ts` — no network call ever leaves the browser.

## Switching scenarios

The interceptor reads `sessionStorage.fixtureScenario` (default: `'default'`
— a fully populated, realistic dataset). In the browser console:

```js
sessionStorage.setItem('fixtureScenario', 'staleConflict'); location.reload();
```

Valid values: `default`, `empty`, `notFound`, `staleConflict`,
`illegalTransition`, `validationFailed`, `writeFrozen`, `fullOutage`,
`unknownError`. `writeFrozen`/`fullOutage` gate only the same three route
families the real `ClassroomLiteOperatingModeInterceptor` scopes on the
backend (`curricula/**`, `classes/*/curriculum-assignment/**`,
`classes/*/modules/**`) — everything else (dance styles, class detail)
keeps responding normally, matching real backend behavior.

Issue #67 (class archive) has its own, separate scenario flag,
`sessionStorage.classArchiveFixtureScenario`: `default` (archive/restore/
delete all succeed), `blocked` (archive returns the 409
`CLASS_ARCHIVE_BLOCKED` typed error), `stale` (archive/restore return the
409 `STALE_CONFLICT` typed error), `deleteBlocked` (delete returns the 409
`CLASS_DELETE_BLOCKED` typed error). Class id 1 (`FIXTURE_CLASS`) is active;
class id 2 (`FIXTURE_ARCHIVED_CLASS`) is already archived, for the
"Archived" tab / restore-flow pass.

Issue #66 Phase 2A/2B (Add/End/Transfer enrollment) share one flag,
`sessionStorage.enrollmentFixtureScenario`: `default` (Add/End/Transfer all
succeed), `addBlocked` (Add returns the 409 `ENROLLMENT_DUPLICATE_ACTIVE`
typed error), `endStale` (End returns the 409 `STALE_CONFLICT` typed
error), `transferBlocked` (Transfer returns the 409
`ENROLLMENT_DUPLICATE_ACTIVE` typed error, simulating an already-current
enrollment in the destination class). Unlike the classes fixture,
`FIXTURE_STUDENT_DETAIL.enrollments` is genuinely stateful within a page
session -- Add pushes a new row, End mutates the target row in place, and
Transfer does both atomically in one handler (ends the source, pushes the
target) -- (`student-profile-fixture.interceptor.ts`), so a reload after
any of the three shows the real before/after change, not a static
snapshot. A second active class (id 3, `FIXTURE_CLASS_2`, alongside the
original id 1) exists specifically so the Transfer dialog's destination
picker has a genuine choice besides the source class itself.

## Disposition after Slice 6 verification

Kept as isolated, clearly-labeled test infrastructure (this README, the
`dev-fixtures` directory, and `main.verify.ts`) since it has ongoing value
for any future curriculum-frontend change made without a staging backend.
It is not part of any shipped artifact and needs no further action to stay
that way — the build graph, not a manual step, is what keeps it out.
