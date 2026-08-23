// TEST/DEV-ONLY. Answers every /school/assignments/** request from static
// fixture data for the verify build's manual browser-verification pass.
// Scenario selection: sessionStorage('assignmentFixtureScenario').

import { HttpInterceptorFn, HttpResponse, HttpErrorResponse, HttpRequest } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  FIXTURE_CAPABILITY_ENABLED, FIXTURE_CAPABILITY_DISABLED, FIXTURE_TEMPLATE, FIXTURE_TEMPLATE_SUMMARIES,
  FIXTURE_TEMPLATE_PUBLISHED_ONLY, FIXTURE_VERSION_PUBLISHED, FIXTURE_VERSION_AUTO_DRAFT,
  FIXTURE_ELIGIBLE_CLASSES, FIXTURE_VERSION, FIXTURE_INSTANCE_SUMMARIES, FIXTURE_INSTANCE_DETAIL,
  FIXTURE_STUDENT_ROLLUP, FIXTURE_LATE_ENROLLEES, FIXTURE_QUEUE, FIXTURE_SUBMISSION_DETAIL
} from './assignment-fixture-data';

type AssignmentScenario =
  | 'default' | 'capabilityDisabled' | 'capabilityEnabled' | 'capabilityWriteFrozen' | 'capabilityFullOutage' | 'capabilityUnknown'
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

  // Shared app-wide operating mode (same sessionStorage('fixtureScenario') key
  // curriculumFixtureInterceptor uses) -- mirrors the real backend's single
  // ClassroomLiteOperatingModeInterceptor, which gates /school/assignments/**
  // identically to /school/curricula/** (Plan v2.1.1 §4/§8.5). FULL_OUTAGE
  // blocks every method including GET (matches real
  // ClassroomLiteOperatingModeInterceptor.preHandle); WRITE_FROZEN only
  // blocks non-safe methods, so GET /capability is never blocked by it.
  const appMode = sessionStorage.getItem('fixtureScenario');
  if (appMode === 'fullOutage') {
    return errorResponse(503, 'FULL_OUTAGE', 'Assignments are temporarily unavailable.', req.url);
  }
  if (appMode === 'writeFrozen' && req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS') {
    return errorResponse(423, 'WRITE_FROZEN', 'Assignments are temporarily read-only.', req.url);
  }

  if (path === '/school/assignments/capability') {
    if (s === 'capabilityFullOutage') return errorResponse(503, 'FULL_OUTAGE', 'Assignments are temporarily unavailable.', req.url);
    if (s === 'capabilityUnknown') return errorResponse(500, '', '', req.url); // non-503, non-FULL_OUTAGE -- resolves as unavailable() without isOutage()
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

  // Template 2: published-only, no open draft -- exercises T3 auto-draft-on-edit and T9 Assign to Class.
  if (path === '/school/assignments/templates/2' && req.method === 'GET') return ok(FIXTURE_TEMPLATE_PUBLISHED_ONLY);
  if (path === '/school/assignments/templates/2/eligible-classes') return ok(FIXTURE_ELIGIBLE_CLASSES);
  if (path === '/school/assignments/templates/2/draft') return ok(FIXTURE_VERSION_AUTO_DRAFT); // startDraft() -- T3's auto-created draft

  if (path === '/school/assignments/versions/1000' && req.method === 'GET') {
    if (s === 'guardedDeleteNotFoundOnRefresh') return ok({ ...FIXTURE_VERSION, questions: [] }); // target question absent from the refreshed payload -- delete dialogs' not-found path
    return ok(FIXTURE_VERSION);
  }
  if (path === '/school/assignments/versions/1001' && req.method === 'GET') return ok(FIXTURE_VERSION_PUBLISHED);
  if (path === '/school/assignments/versions/1002' && req.method === 'GET') return ok(FIXTURE_VERSION_AUTO_DRAFT);
  if (path === '/school/assignments/versions/1002/questions' && req.method === 'POST') {
    const body = req.body as { questionType: string; prompt: string; questionOrder: number; maxSelections: number | null };
    return ok({ id: 20, templateVersionId: 1002, rowVersion: 0, options: [], ...body });
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

  // T3 defect-fix manual verification tripwires (template 2's published-only
  // clone flow): 10/20/30 are the PUBLISHED version's ids -- a fixed T3
  // implementation must never target these once auto-draft has cloned.
  // 11/21/41/42 are the CLONE's ids -- the only correct targets post-clone.
  if (path === '/school/assignments/questions/10' && req.method === 'PUT') {
    return errorResponse(400, 'FIXTURE_BUG_PUBLISHED_ID_USED', 'T3 defect: mutation targeted the PUBLISHED question id (10), not the cloned draft id (11).', req.url);
  }
  if (path === '/school/assignments/questions/11' && req.method === 'PUT') {
    const body = req.body as { prompt: string; questionOrder: number; maxSelections: number | null };
    return ok({ id: 11, templateVersionId: 1002, questionType: 'SHORT_TEXT', rowVersion: 1, options: [], ...body });
  }
  if (path === '/school/assignments/options/30' && req.method === 'PUT') {
    return errorResponse(400, 'FIXTURE_BUG_PUBLISHED_ID_USED', 'T3 defect: mutation targeted the PUBLISHED option id (30), not the cloned draft id (41).', req.url);
  }
  if (path === '/school/assignments/options/41' && req.method === 'PUT') {
    const body = req.body as { optionLabel: string; optionOrder: number; isCorrect: boolean };
    return ok({ id: 41, questionId: 21, rowVersion: 1, ...body });
  }
  if (path.startsWith('/school/assignments/questions/') && path.endsWith('/options/reorder')) return ok([]);

  if (path === '/school/assignments/instances' && req.method === 'POST') {
    const body = req.body as { templateId: number; classId: number; dueAt: string; idempotencyKey: string };
    return ok({ id: 6000, templateVersionId: 1001, moduleId: 10, classId: body.classId, dueAt: body.dueAt, status: 'ACTIVE', idempotencyKey: body.idempotencyKey, rowVersion: 0, createdAt: new Date().toISOString(), createdBy: 1, closedAt: null, withdrawnAt: null, withdrawnBy: null });
  }
  if (path === '/school/assignments/instances/6000' && req.method === 'GET') {
    return ok({ id: 6000, templateVersionId: 1001, templateTitle: 'Unit 2 Quiz (published)', moduleId: 10, moduleTitle: 'Bharatanatyam Basics', classId: 1, className: 'Tuesday Beginners', dueAt: '2026-09-15T00:00:00', status: 'ACTIVE', idempotencyKey: 'k', rowVersion: 0, createdAt: '', createdBy: 1, closedAt: null, withdrawnAt: null, withdrawnBy: null });
  }
  if (path === '/school/assignments/instances/6000/students') return ok([]);
  if (path === '/school/assignments/instances/6000/late-enrollees') return ok([]);
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
