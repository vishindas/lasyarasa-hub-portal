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

## Disposition after Slice 6 verification

Kept as isolated, clearly-labeled test infrastructure (this README, the
`dev-fixtures` directory, and `main.verify.ts`) since it has ongoing value
for any future curriculum-frontend change made without a staging backend.
It is not part of any shipped artifact and needs no further action to stay
that way — the build graph, not a manual step, is what keeps it out.
