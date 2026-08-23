// TEST/DEV-ONLY. Answers every /school/assignments/** request from static
// fixture data for the verify build's manual browser-verification pass.
// Scenario selection: sessionStorage('assignmentFixtureScenario').

import { HttpInterceptorFn, HttpResponse, HttpErrorResponse, HttpRequest } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  FIXTURE_CAPABILITY_ENABLED, FIXTURE_CAPABILITY_DISABLED, FIXTURE_TEMPLATE, FIXTURE_TEMPLATE_SUMMARIES,
  FIXTURE_ELIGIBLE_CLASSES, FIXTURE_VERSION, FIXTURE_INSTANCE_SUMMARIES, FIXTURE_INSTANCE_DETAIL,
  FIXTURE_STUDENT_ROLLUP, FIXTURE_LATE_ENROLLEES, FIXTURE_QUEUE, FIXTURE_SUBMISSION_DETAIL
} from './assignment-fixture-data';

type AssignmentScenario =
  | 'default' | 'capabilityDisabled' | 'capabilityEnabled' | 'capabilityWriteFrozen' | 'capabilityFullOutage'
  | 'reorderValidationFailed' | 'reorderStale' | 'guardedDeleteStale' | 'guardedDeleteNotFoundOnRefresh';

function scenario(): AssignmentScenario {
  return (sessionStorage.getItem('assignmentFixtureScenario') as AssignmentScenario) || 'default';
}

function page<T>(content: T[]) {
  return { content, totalElements: content.length, totalPages: 1, number: 0, size: 50 };
}

function ok<T>(body: T): Observable<HttpResponse<T>> {
  return of(new HttpResponse({ status: 200, body })).pipe(delay(150));
}

function errorResponse(status: number, code: string, message: string, url: string): Observable<never> {
  return throwError(() => new HttpErrorResponse({ status, statusText: code, url, error: { code, message, resource: null } })).pipe(delay(120));
}

export const assignmentFixtureInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next) => {
  if (!req.url.startsWith(environment.apiUrl)) return next(req);
  // Strip the query string for route matching -- list endpoints build their
  // URL with a raw `?page=&size=&...` suffix rather than HttpParams, so
  // req.url (and therefore path) includes it.
  const path = req.url.slice(environment.apiUrl.length).split('?')[0];
  if (!path.startsWith('/school/assignments')) return next(req);

  const s = scenario();

  if (path === '/school/assignments/capability') {
    if (s === 'capabilityFullOutage') return errorResponse(503, 'FULL_OUTAGE', 'Assignments are temporarily unavailable.', req.url);
    if (s === 'capabilityWriteFrozen') return ok(FIXTURE_CAPABILITY_ENABLED); // safe method, never blocked -- see Plan §3.5
    if (s === 'capabilityDisabled') return ok(FIXTURE_CAPABILITY_DISABLED);
    return ok(FIXTURE_CAPABILITY_ENABLED); // 'capabilityEnabled' + 'default'
  }

  if (path === '/school/assignments/templates' && req.method === 'GET') return ok(page(FIXTURE_TEMPLATE_SUMMARIES));
  if (path === '/school/assignments/templates' && req.method === 'POST') return ok(FIXTURE_TEMPLATE);
  if (path === '/school/assignments/templates/1' && req.method === 'GET') return ok(FIXTURE_TEMPLATE);
  if (path === '/school/assignments/templates/1/eligible-classes') return ok(FIXTURE_ELIGIBLE_CLASSES);
  if (path === '/school/assignments/templates/1/publish') return ok(FIXTURE_TEMPLATE);
  if (path === '/school/assignments/templates/1/archive') return ok(FIXTURE_TEMPLATE);
  if (path === '/school/assignments/templates/1/draft') return ok(FIXTURE_VERSION);

  if (path === '/school/assignments/versions/1000' && req.method === 'GET') {
    if (s === 'guardedDeleteNotFoundOnRefresh') return ok({ ...FIXTURE_VERSION, questions: [] }); // target question absent from the refreshed payload -- delete dialogs' not-found path
    return ok(FIXTURE_VERSION);
  }
  if (path === '/school/assignments/versions/1000/questions/reorder') {
    if (s === 'reorderValidationFailed') return errorResponse(400, 'VALIDATION_FAILED', 'The submitted set does not match the current questions.', req.url);
    if (s === 'reorderStale') return errorResponse(409, 'STALE_VERSION', 'This changed since you opened it.', req.url);
    return ok(FIXTURE_VERSION.questions);
  }

  if (path === '/school/assignments/questions/1' && req.method === 'DELETE') {
    if (s === 'guardedDeleteStale') return errorResponse(409, 'STALE_VERSION', 'This changed since you opened it.', req.url);
    return ok(null);
  }
  if (path.startsWith('/school/assignments/questions/') && path.endsWith('/options/reorder')) return ok([]);

  if (path === '/school/assignments/instances' && req.method === 'GET') return ok(page(FIXTURE_INSTANCE_SUMMARIES));
  if (path === '/school/assignments/instances/5000' && req.method === 'GET') return ok(FIXTURE_INSTANCE_DETAIL);
  if (path === '/school/assignments/instances/5000/students') return ok(FIXTURE_STUDENT_ROLLUP);
  if (path === '/school/assignments/instances/5000/late-enrollees') return ok(FIXTURE_LATE_ENROLLEES);

  if (path === '/school/assignments/submissions' && req.method === 'GET') return ok(page(FIXTURE_QUEUE));
  if (path === '/school/assignments/submissions/9000' && req.method === 'GET') return ok(FIXTURE_SUBMISSION_DETAIL);
  if (path === '/school/assignments/submissions/9000/validate') return ok(null);
  if (path === '/school/assignments/submissions/9000/request-revision') return ok(null);

  return next(req);
};
