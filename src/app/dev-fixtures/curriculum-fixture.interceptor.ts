// TEST/DEV-ONLY. See dev-fixtures/README.md. Intercepts every request to
// environment.apiUrl and answers from static, deterministic fixture data --
// nothing from this build configuration ever reaches a real network.
//
// Scenario selection is read from sessionStorage('fixtureScenario') so a
// manual verification pass can drive every required state (empty,
// validation, not-found, stale-conflict, illegal-transition, WRITE_FROZEN,
// FULL_OUTAGE, unknown-error) deterministically by setting the flag and
// reloading/acting, without any automated timer or randomness.

import { HttpInterceptorFn, HttpResponse, HttpErrorResponse, HttpRequest } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  FIXTURE_DANCE_STYLES, FIXTURE_CURRICULA, FIXTURE_VERSIONS, FIXTURE_MODULES,
  FIXTURE_ASSIGNMENT, FIXTURE_MODULE_STATES, FIXTURE_CLASS
} from './curriculum-fixture-data';
import { CurriculumErrorResponse } from '../core/models/curriculum.model';

type Scenario = 'default' | 'empty' | 'notFound' | 'staleConflict' | 'illegalTransition' | 'validationFailed' | 'writeFrozen' | 'fullOutage' | 'unknownError';

function scenario(): Scenario {
  return (sessionStorage.getItem('fixtureScenario') as Scenario) || 'default';
}

// Mirrors curriculum-mode.interceptor.ts's own route scoping exactly, so the fixture's
// WRITE_FROZEN/FULL_OUTAGE gating matches what the real backend actually scopes.
const CURRICULUM_PATH_RE = /\/school\/(curricula(\/|$)|classes\/[^/]+\/(curriculum-assignment|modules)(\/|$))/;

function errorResponse(status: number, code: string, message: string, resource: string | null, url: string): Observable<never> {
  const body: CurriculumErrorResponse = { code, message, resource };
  return throwError(() => new HttpErrorResponse({ status, statusText: code, url, error: body })).pipe(delay(120));
}

function ok<T>(body: T): Observable<HttpResponse<T>> {
  return of(new HttpResponse({ status: 200, body })).pipe(delay(150)); // small delay so loading states are visibly reachable during a manual pass
}

export const curriculumFixtureInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next) => {
  if (!req.url.startsWith(environment.apiUrl)) {
    return next(req); // Angular assets/etc. -- not our concern
  }
  const path = req.url.slice(environment.apiUrl.length);
  const s = scenario();

  // Never-gated (always real-ish, matching the backend's own route scoping): dance styles, class detail/students.
  if (path === '/school/settings/dance-styles') return ok(FIXTURE_DANCE_STYLES);
  if (path === '/school/settings/currency') return ok({ currency: 'INR' });
  if (path === '/school/classes/1' && req.method === 'GET') return ok(FIXTURE_CLASS);
  if (path === '/school/classes/1/students') return ok([]);
  if (path === '/school/classes' && req.method === 'GET') return ok([FIXTURE_CLASS]);

  const isCurriculumRoute = CURRICULUM_PATH_RE.test(path);

  if (isCurriculumRoute && s === 'fullOutage') {
    return errorResponse(503, 'FULL_OUTAGE', 'Curriculum is temporarily unavailable.', null, req.url);
  }
  if (isCurriculumRoute && s === 'writeFrozen' && req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS') {
    return errorResponse(423, 'WRITE_FROZEN', 'Curriculum is temporarily read-only.', null, req.url);
  }

  // -- Curricula / versions --------------------------------------------------
  if (path === '/school/curricula' && req.method === 'GET') {
    return ok(s === 'empty' ? [] : FIXTURE_CURRICULA);
  }
  if (path === '/school/curricula' && req.method === 'POST') {
    if (s === 'validationFailed') return errorResponse(400, 'VALIDATION_FAILED', 'internalName must not be blank', 'Request', req.url);
    if (s === 'unknownError') return errorResponse(500, '', '', null, req.url);
    const created = { ...FIXTURE_VERSIONS[0], id: 999, curriculumId: 999, title: (req.body as { title?: string })?.title || 'New curriculum' };
    return ok(created);
  }
  const versionsMatch = path.match(/^\/school\/curricula\/(\d+)\/versions$/);
  if (versionsMatch && req.method === 'GET') {
    const curriculumId = Number(versionsMatch[1]);
    return ok(s === 'empty' ? [] : FIXTURE_VERSIONS.filter(v => v.curriculumId === curriculumId));
  }
  const curriculumGetMatch = path.match(/^\/school\/curricula\/(\d+)$/);
  if (curriculumGetMatch && req.method === 'GET') {
    const c = FIXTURE_CURRICULA.find(x => x.id === Number(curriculumGetMatch[1]));
    if (!c || s === 'notFound') return errorResponse(404, 'RESOURCE_NOT_FOUND', 'This curriculum is unavailable.', 'Curriculum', req.url);
    return ok(c);
  }
  const versionActionMatch = path.match(/^\/school\/curricula\/(\d+)\/versions\/(\d+)(\/(activate|archive|clone))?$/);
  if (versionActionMatch) {
    const versionId = Number(versionActionMatch[2]);
    const action = versionActionMatch[4];
    const v = FIXTURE_VERSIONS.find(x => x.id === versionId);
    if (!v) return errorResponse(404, 'RESOURCE_NOT_FOUND', 'This version is unavailable.', 'CurriculumVersion', req.url);
    if (req.method === 'GET') return ok(v);
    if (s === 'staleConflict') return errorResponse(409, 'STALE_VERSION', 'This version was already changed — reload to see the latest structure.', 'CurriculumVersion', req.url);
    if (s === 'validationFailed' && action === 'activate') return errorResponse(400, 'VALIDATION_FAILED', 'A curriculum version needs at least one module before it can be activated.', 'CurriculumVersion', req.url);
    if (s === 'unknownError') return errorResponse(500, '', '', null, req.url);
    if (req.method === 'PUT') {
      const body = req.body as { title: string; level: string | null; objectives: string | null };
      return ok({ ...v, title: body.title, level: body.level, objectives: body.objectives, rowVersion: v.rowVersion + 1 });
    }
    if (action === 'activate') return ok({ ...v, status: 'ACTIVE', activatedAt: new Date().toISOString(), activatedBy: 100, rowVersion: v.rowVersion + 1 });
    if (action === 'archive') return ok({ ...v, status: 'ARCHIVED', archivedAt: new Date().toISOString(), archivedBy: 100, rowVersion: v.rowVersion + 1 });
    if (action === 'clone') return ok({ ...v, id: 998, versionNumber: v.versionNumber + 1, status: 'DRAFT', clonedFromVersionId: v.id, activatedAt: null, activatedBy: null, archivedAt: null, archivedBy: null, rowVersion: 0 });
  }

  // -- Modules ------------------------------------------------------------
  const moduleListMatch = path.match(/^\/school\/curricula\/versions\/(\d+)\/modules$/);
  if (moduleListMatch && req.method === 'GET') {
    const versionId = Number(moduleListMatch[1]);
    return ok(s === 'empty' ? [] : FIXTURE_MODULES.filter(m => m.curriculumVersionId === versionId).sort((a, b) => a.moduleOrder - b.moduleOrder));
  }
  if (moduleListMatch && req.method === 'POST') {
    if (s === 'staleConflict') return errorResponse(409, 'STALE_VERSION', 'Duplicate module order — reload to see the latest structure.', 'CurriculumModule', req.url);
    const versionId = Number(moduleListMatch[1]);
    const body = req.body as { title: string; objectives: string | null; moduleOrder: number };
    return ok({ id: 900 + Math.floor(Math.random() * 90), curriculumVersionId: versionId, title: body.title, objectives: body.objectives, moduleOrder: body.moduleOrder, contentStatus: 'DRAFT', rowVersion: 0, publishedAt: null, publishedBy: null, archivedAt: null, archivedBy: null });
  }
  if (path.match(/^\/school\/curricula\/versions\/(\d+)\/modules\/reorder$/) && req.method === 'POST') {
    const versionId = Number(path.match(/versions\/(\d+)\/modules\/reorder/)![1]);
    if (s === 'staleConflict') return errorResponse(409, 'STALE_VERSION', 'Modules can only be reordered while the curriculum version is DRAFT.', 'CurriculumModule', req.url);
    const entries = (req.body as { entries: { moduleId: number; newOrder: number }[] }).entries;
    const updated = FIXTURE_MODULES.filter(m => m.curriculumVersionId === versionId).map(m => {
      const entry = entries.find(e => e.moduleId === m.id);
      return entry ? { ...m, moduleOrder: entry.newOrder, rowVersion: m.rowVersion + 1 } : m;
    }).sort((a, b) => a.moduleOrder - b.moduleOrder);
    return ok(updated);
  }
  const moduleActionMatch = path.match(/^\/school\/curricula\/versions\/modules\/(\d+)(\/(publish|archive))?$/);
  if (moduleActionMatch) {
    const moduleId = Number(moduleActionMatch[1]);
    const action = moduleActionMatch[3];
    const m = FIXTURE_MODULES.find(x => x.id === moduleId);
    if (!m || s === 'notFound') return errorResponse(404, 'RESOURCE_NOT_FOUND', 'This module is unavailable.', 'CurriculumModule', req.url);
    if (s === 'staleConflict') return errorResponse(409, 'STALE_VERSION', 'This module was already changed — reload.', 'CurriculumModule', req.url);
    if (s === 'illegalTransition' && (req.method === 'PUT' || action)) {
      return errorResponse(409, 'ILLEGAL_TRANSITION', "This module's content is no longer editable — its curriculum version is not DRAFT.", 'CurriculumModule', req.url);
    }
    if (req.method === 'PUT') {
      const body = req.body as { title: string; objectives: string | null };
      return ok({ ...m, title: body.title, objectives: body.objectives, rowVersion: m.rowVersion + 1 });
    }
    if (action === 'publish') return ok({ ...m, contentStatus: 'PUBLISHED', publishedAt: new Date().toISOString(), publishedBy: 100, rowVersion: m.rowVersion + 1 });
    if (action === 'archive') return ok({ ...m, contentStatus: 'ARCHIVED', archivedAt: new Date().toISOString(), archivedBy: 100, rowVersion: m.rowVersion + 1 });
  }

  // -- Class curriculum assignment / module states -------------------------
  const classIdMatch = path.match(/^\/school\/classes\/(\d+)\//);
  const classId = classIdMatch ? Number(classIdMatch[1]) : null;

  if (path === `/school/classes/${classId}/curriculum-assignment` && req.method === 'GET') {
    if (classId !== 1 || s === 'empty' || s === 'notFound') {
      return errorResponse(404, 'RESOURCE_NOT_FOUND', 'This class has no current curriculum assignment.', 'ClassCurriculumAssignment', req.url);
    }
    return ok(FIXTURE_ASSIGNMENT);
  }
  if (path === `/school/classes/${classId}/curriculum-assignment/module-states` && req.method === 'GET') {
    return ok(classId === 1 && s !== 'empty' ? FIXTURE_MODULE_STATES : []);
  }
  if (path === `/school/classes/${classId}/curriculum-assignment` && req.method === 'POST') {
    if (s === 'staleConflict') return errorResponse(409, 'STALE_VERSION', 'This curriculum version was already changed — reload.', 'CurriculumVersion', req.url);
    if (s === 'unknownError') return errorResponse(500, '', '', null, req.url);
    const body = req.body as { curriculumVersionId: number; expectedRowVersion: number };
    return ok({ id: 51, classId, curriculumVersionId: body.curriculumVersionId, activeFrom: new Date().toISOString(), activeTo: null, endedBy: null, rowVersion: 0 });
  }
  const stateActionMatch = path.match(/^\/school\/classes\/(\d+)\/modules\/(\d+)\/(release|relock|complete|withdraw)$/);
  if (stateActionMatch) {
    const stateId = Number(stateActionMatch[2]);
    const action = stateActionMatch[3];
    const state = FIXTURE_MODULE_STATES.find(x => x.id === stateId);
    if (!state) return errorResponse(404, 'RESOURCE_NOT_FOUND', 'This module state is unavailable.', 'ClassModuleState', req.url);
    if (s === 'staleConflict') return errorResponse(409, 'STALE_VERSION', 'This module state was already changed — reload.', 'ClassModuleState', req.url);
    if (s === 'illegalTransition') return errorResponse(409, 'ILLEGAL_TRANSITION', 'This class has since migrated to a different curriculum.', 'ClassModuleState', req.url);
    if (action === 'release') return ok({ ...state, status: 'RELEASED', releasedAt: new Date().toISOString(), releasedBy: 100, rowVersion: state.rowVersion + 1 });
    if (action === 'relock') return ok({ ...state, status: 'LOCKED', relockedAt: new Date().toISOString(), relockedBy: 100, rowVersion: state.rowVersion + 1 });
    if (action === 'complete') return ok({ ...state, status: 'COMPLETED', completedAt: new Date().toISOString(), completedBy: 100, rowVersion: state.rowVersion + 1 });
    if (action === 'withdraw') {
      const body = req.body as { reason: string };
      return ok({ ...state, status: 'WITHDRAWN', withdrawnAt: new Date().toISOString(), withdrawnBy: 100, withdrawReason: body.reason, rowVersion: state.rowVersion + 1 });
    }
  }
  if (path === `/school/classes/${classId}/curriculum-assignment/change-preview` && req.method === 'GET') {
    if (s === 'validationFailed') return errorResponse(400, 'VALIDATION_FAILED', 'The target curriculum version must be ACTIVE.', 'ChangeCurriculum', req.url);
    const targetId = Number(req.params.get('targetCurriculumVersionId'));
    return ok({
      targetCurriculumVersionId: targetId,
      added: [{ oldModuleId: null, oldTitle: null, newModuleId: 212, newTitle: 'Padams (revised)' }],
      removed: [{ oldModuleId: 202, oldTitle: 'Basic Jatis', newModuleId: null, newTitle: null }],
      matching: [{ oldModuleId: 201, oldTitle: 'Namaskaram', newModuleId: 211, newTitle: 'Namaskaram' }]
    });
  }
  if (path === `/school/classes/${classId}/curriculum-assignment/change-confirm` && req.method === 'POST') {
    if (s === 'staleConflict') return errorResponse(409, 'STALE_VERSION', 'Target version changed — re-run preview before confirming.', 'ClassCurriculumAssignment', req.url);
    const body = req.body as { targetCurriculumVersionId: number };
    return ok({ id: 60, classId, curriculumVersionId: body.targetCurriculumVersionId, activeFrom: new Date().toISOString(), activeTo: null, endedBy: null, rowVersion: 0 });
  }

  // Catch-all so the rest of the shell (unrelated to curriculum) never breaks in verify mode.
  if (req.method === 'GET') return ok([]);
  return ok({});
};
