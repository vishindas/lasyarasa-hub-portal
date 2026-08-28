// TEST/DEV-ONLY bootstrap for local browser verification against the
// curriculum fixture interceptor (dev-fixtures/README.md). Never referenced
// by the "production" (or default) build configuration -- see angular.json's
// "verify" configuration, which is the only place src/main.ts is swapped
// for this file. A production build's esbuild graph starts at src/main.ts
// and never reaches this file or anything it imports.

import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideNativeDateAdapter } from '@angular/material/core';
import { routes } from './app/app.routes';
import { App } from './app/app';
import { curriculumFixtureInterceptor } from './app/dev-fixtures/curriculum-fixture.interceptor';
import { assignmentFixtureInterceptor } from './app/dev-fixtures/assignment-fixture.interceptor';
import { studentAssignmentFixtureInterceptor } from './app/dev-fixtures/student-assignment-fixture.interceptor';
import { curriculumModeInterceptor } from './app/core/services/curriculum-mode.interceptor';
import { studentLearningAccessInterceptor } from './app/core/services/student-learning-access.interceptor';
import { environment } from './environments/environment';

// Seed a fake, obviously-fake session so the route guards pass without ever
// hitting the real /auth/login endpoint. The real jwtInterceptor is
// deliberately not wired in here -- every /api/ request is answered
// entirely by curriculumFixtureInterceptor before it would ever reach the
// network, so there is nothing for an auth header to be attached to.
//
// Slice 12: sessionStorage('fixtureRole') switches the seeded role between
// the pre-existing SCHOOL_ADMIN verification path (default, unchanged) and
// a CLIENT session for exercising My Students / Student Learning. This is
// verification-only bootstrap code, excluded from every real build
// configuration by the same esbuild-graph guarantee as the rest of this
// file -- not the "runtime configuration infrastructure" the architect
// ruled out for the shipped app itself. When CLIENT is selected,
// studentLearningEntryEnabled is forced true by default here, in this file
// only, so the entry-enabled flow can be exercised locally without ever
// changing the committed false default in src/environments/*.
//
// Verification-closure addition: sessionStorage('fixtureEntryOverride') ===
// 'false' keeps the real committed default (false) even under a CLIENT
// session, so My Students' actual dormant rendering (no learning
// links/affordances) can also be captured under real CLIENT auth, not only
// inferred from the SCHOOL_ADMIN-inaccessible route guard. Any other value
// (including unset) preserves the pre-existing forced-true behavior.
const fixtureRole = sessionStorage.getItem('fixtureRole') === 'CLIENT' ? 'CLIENT' : 'SCHOOL_ADMIN';
const fixtureEntryOverride = sessionStorage.getItem('fixtureEntryOverride');
if (fixtureRole === 'CLIENT') {
  localStorage.setItem('lr_token', 'fixture-token-not-real');
  localStorage.setItem('lr_user', JSON.stringify({ email: 'verify-client@example.test', role: 'CLIENT', providerId: null }));
  if (fixtureEntryOverride !== 'false') {
    (environment as { studentLearningEntryEnabled: boolean }).studentLearningEntryEnabled = true;
  }
} else {
  localStorage.setItem('lr_token', 'fixture-token-not-real');
  localStorage.setItem('lr_user', JSON.stringify({ email: 'verify@example.test', role: 'SCHOOL_ADMIN', providerId: 1 }));
}

bootstrapApplication(App, {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    // curriculumModeInterceptor is the real, shipped interceptor -- kept in
    // the chain here so a WRITE_FROZEN/FULL_OUTAGE fixture response is
    // observed exactly as it would be against the real backend. It must
    // wrap both fixture interceptors (i.e. come first): interceptor order
    // is outermost-to-innermost, and the fixtures are standing in for the
    // backend itself, not calling next().
    //
    // assignmentFixtureInterceptor/studentAssignmentFixtureInterceptor must
    // come BEFORE curriculumFixtureInterceptor: curriculumFixtureInterceptor
    // has an unconditional catch-all at its end (`if GET return ok([]);
    // return ok({})`) for any environment.apiUrl-prefixed path it doesn't
    // explicitly recognize, and neither /school/assignments/** nor
    // /account/students/*/learning/assignments/** was ever one of its
    // recognized paths -- with the reverse order, every assignment request
    // was silently answered by that catch-all instead of ever reaching the
    // real fixture. Caught during Slice 15's own manual verify-build pass
    // (Plan v2.1.2 §14) -- see that slice's implementation report.
    //
    // studentLearningAccessInterceptor is also the real, shipped
    // interceptor -- it was missing here entirely, which meant the whole
    // StudentAccessLossService/lost-access mechanism could never fire
    // during manual verification no matter what fixtureScenario was set,
    // even though its copy/behavior looked plausible for other reasons.
    // Found while investigating why a shell-level lost-access fix didn't
    // visibly take effect under manual verification. Must come before
    // curriculumFixtureInterceptor for the same reason as the two above --
    // it needs to observe the fixture's thrown STUDENT_CONTEXT_UNAVAILABLE
    // response, which only reaches it if it wraps (comes before) the
    // fixture in this array.
    provideHttpClient(withInterceptors([curriculumModeInterceptor, studentLearningAccessInterceptor, assignmentFixtureInterceptor, studentAssignmentFixtureInterceptor, curriculumFixtureInterceptor])),
    provideAnimationsAsync(),
    provideNativeDateAdapter()
  ]
}).catch(err => console.error(err));
