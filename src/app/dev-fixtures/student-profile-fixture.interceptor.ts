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

import { HttpInterceptorFn, HttpResponse, HttpRequest } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { FIXTURE_STUDENT_DETAIL, fixturePortalAccessStatus, PortalAccessFixtureScenario } from './student-profile-fixture-data';

function ok<T>(body: T): Observable<HttpResponse<T>> {
  return of(new HttpResponse({ status: 200, body })).pipe(delay(150));
}

const STUDENT_ID = FIXTURE_STUDENT_DETAIL.student.id;
const DETAIL_PATH = `/school/v2/students/${STUDENT_ID}`;
const STATUS_PATH = `${DETAIL_PATH}/portal-access-status`;

function scenario(): PortalAccessFixtureScenario {
  return (sessionStorage.getItem('portalAccessFixtureScenario') as PortalAccessFixtureScenario) || 'needsSetup';
}

export const studentProfileFixtureInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next) => {
  if (!req.url.startsWith(environment.apiUrl)) return next(req);
  const path = req.url.slice(environment.apiUrl.length).split('?')[0];

  if (path === STATUS_PATH && req.method === 'GET') {
    return ok(fixturePortalAccessStatus(scenario()));
  }
  if (path === DETAIL_PATH && req.method === 'GET') {
    return ok(FIXTURE_STUDENT_DETAIL);
  }
  return next(req);
};
