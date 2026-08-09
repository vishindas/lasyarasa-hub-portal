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
import { curriculumModeInterceptor } from './app/core/services/curriculum-mode.interceptor';

// Seed a fake, obviously-fake session so the route guards pass without ever
// hitting the real /auth/login endpoint. The real jwtInterceptor is
// deliberately not wired in here -- every /api/ request is answered
// entirely by curriculumFixtureInterceptor before it would ever reach the
// network, so there is nothing for an auth header to be attached to.
localStorage.setItem('lr_token', 'fixture-token-not-real');
localStorage.setItem('lr_user', JSON.stringify({ email: 'verify@example.test', role: 'SCHOOL_ADMIN', providerId: 1 }));

bootstrapApplication(App, {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    // curriculumModeInterceptor is the real, shipped interceptor -- kept in
    // the chain here so a WRITE_FROZEN/FULL_OUTAGE fixture response is
    // observed exactly as it would be against the real backend. It must
    // wrap curriculumFixtureInterceptor (i.e. come first): interceptor
    // order is outermost-to-innermost, and the fixture is standing in for
    // the backend itself, not calling next().
    provideHttpClient(withInterceptors([curriculumModeInterceptor, curriculumFixtureInterceptor])),
    provideAnimationsAsync(),
    provideNativeDateAdapter()
  ]
}).catch(err => console.error(err));
