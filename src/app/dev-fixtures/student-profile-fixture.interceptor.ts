// TEST/DEV-ONLY. See dev-fixtures/README.md. Answers exactly the two
// requests StudentProfileComponent + PortalAccessCard need a real shape
// for -- GET /school/v2/students/{id} and GET
// /school/v2/students/{id}/portal-access-status -- for the verify build's
// manual browser-verification pass (Portal Access Onboarding Slice 3).
// Every other request StudentProfileComponent fires on load (fee-overrides,
// fees, settings, classes) is left to curriculumFixtureInterceptor's own
// existing catch-all (`ok([])`), which is already sufficient for those --
// this file adds nothing for paths that already resolve safely.
//
// Must be registered BEFORE curriculumFixtureInterceptor in main.verify.ts,
// for the same reason already documented there: that interceptor's
// catch-all would otherwise answer these two paths first with the wrong
// shape.

import { HttpInterceptorFn, HttpResponse, HttpErrorResponse, HttpRequest } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { FIXTURE_STUDENT_DETAIL, fixturePortalAccessStatus, PortalAccessFixtureScenario } from './student-profile-fixture-data';

function ok<T>(body: T): Observable<HttpResponse<T>> {
  return of(new HttpResponse({ status: 200, body })).pipe(delay(150));
}

function errorResponse(status: number, code: string, message: string, resource: string | null, url: string): Observable<never> {
  return throwError(() => new HttpErrorResponse({ status, statusText: code, url, error: { code, message, resource } })).pipe(delay(120));
}

const STUDENT_ID = FIXTURE_STUDENT_DETAIL.student.id;
const DETAIL_PATH = `/school/v2/students/${STUDENT_ID}`;
const STATUS_PATH = `${DETAIL_PATH}/portal-access-status`;
const ENROLLMENTS_PATH = `${DETAIL_PATH}/enrollments`;

function scenario(): PortalAccessFixtureScenario {
  return (sessionStorage.getItem('portalAccessFixtureScenario') as PortalAccessFixtureScenario) || 'needsSetup';
}

let nextEnrollmentId = 9200;

export const studentProfileFixtureInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next) => {
  if (!req.url.startsWith(environment.apiUrl)) return next(req);
  const path = req.url.slice(environment.apiUrl.length).split('?')[0];

  if (path === STATUS_PATH && req.method === 'GET') {
    return ok(fixturePortalAccessStatus(scenario()));
  }
  if (path === DETAIL_PATH && req.method === 'GET') {
    // A fresh clone, not the literal singleton -- a real network response
    // is always a freshly JSON-deserialized object, and StudentProfileComponent
    // stores this in an Angular signal, whose set() bails out (no re-render)
    // when given the exact same object reference it already holds, even if
    // that object's contents were mutated in place since. Returning the
    // singleton directly here would silently hide every Add/End update.
    return ok(structuredClone(FIXTURE_STUDENT_DETAIL));
  }

  // Issue #66 Phase 2A: Add/End enrollment, mutating the shared
  // FIXTURE_STUDENT_DETAIL.enrollments array in place so a subsequent GET
  // (triggered by the dialog's afterClosed() reload) reflects the change --
  // unlike curriculum-fixture.interceptor.ts's static-snapshot classes,
  // this fixture is genuinely stateful, matching what the real backend does.
  if (path === ENROLLMENTS_PATH && req.method === 'POST') {
    const body = req.body as { classId: number };
    const enrollmentsScenario = sessionStorage.getItem('enrollmentFixtureScenario') || 'default';
    if (enrollmentsScenario === 'addBlocked') {
      return errorResponse(409, 'ENROLLMENT_DUPLICATE_ACTIVE', 'This student already has a current enrollment in this class.', 'Enrollment', req.url);
    }
    const created = {
      id: nextEnrollmentId++, classId: body.classId, className: 'Saturday Beginners', danceStyleId: 1, danceStyleName: 'Bharatanatyam',
      feeTierId: null, feeTierLabel: null, status: 'ACTIVE', startDate: '2026-03-01', resolvedFeeAmount: null,
      endDate: null, endReason: null, endReasonDetails: null, rowVersion: 0
    };
    FIXTURE_STUDENT_DETAIL.enrollments.push(created);
    return ok(created);
  }

  const endMatch = path.match(new RegExp(`^${ENROLLMENTS_PATH}/(\\d+)/end$`));
  if (endMatch && req.method === 'POST') {
    const enrollmentsScenario = sessionStorage.getItem('enrollmentFixtureScenario') || 'default';
    if (enrollmentsScenario === 'endStale') {
      return errorResponse(409, 'STALE_CONFLICT', 'This enrollment has been modified since you last loaded it.', 'Enrollment', req.url);
    }
    const enrollmentId = Number(endMatch[1]);
    const body = req.body as { endReason: string; endReasonDetails: string | null };
    const target = FIXTURE_STUDENT_DETAIL.enrollments.find(e => e.id === enrollmentId);
    if (!target) {
      return errorResponse(404, 'ENROLLMENT_NOT_FOUND', 'Enrollment not found', 'Enrollment', req.url);
    }
    target.status = 'ENDED';
    target.endDate = '2026-03-15';
    target.endReason = body.endReason;
    target.endReasonDetails = body.endReasonDetails;
    target.rowVersion = target.rowVersion + 1;
    return ok(target);
  }

  return next(req);
};
