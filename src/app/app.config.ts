import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withRouterConfig } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideNativeDateAdapter } from '@angular/material/core';
import { routes } from './app.routes';
import { jwtInterceptor } from './core/auth/jwt.interceptor';
import { curriculumModeInterceptor } from './core/services/curriculum-mode.interceptor';
import { studentLearningAccessInterceptor } from './core/services/student-learning-access.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Slice 12 needs studentId (set on the shell route) readable directly
    // from every descendant screen's own ActivatedRoute without manually
    // walking .parent -- 'always' merges ancestor route params, which is
    // safe here since no two routes in this app reuse the same param name
    // for different things.
    provideRouter(routes, withRouterConfig({ paramsInheritanceStrategy: 'always' })),
    provideHttpClient(withInterceptors([jwtInterceptor, curriculumModeInterceptor, studentLearningAccessInterceptor])),
    provideAnimationsAsync(),
    provideNativeDateAdapter()
  ]
};
