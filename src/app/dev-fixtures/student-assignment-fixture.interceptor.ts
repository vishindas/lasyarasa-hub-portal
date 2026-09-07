// TEST/DEV-ONLY. Answers every
// /account/students/{studentId}/learning/assignments/** request from the
// stateful in-memory fixture data (student-assignment-fixture-data.ts) for
// the verify build's manual browser-verification pass. Mirrors
// assignment-fixture.interceptor.ts's (staff) exact conventions: the same
// shared 'fixtureScenario' sessionStorage key drives WRITE_FROZEN/
// FULL_OUTAGE, and the same ok()/errorResponse() helpers are used.

import { HttpErrorResponse, HttpInterceptorFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  DraftResponseDTO, ResponseSummaryDTO, StudentAssignmentDetailDTO
} from '../features/student-assignments/data-access/student-assignment.model';
import {
  FIXTURE_ASSIGNMENT_STUDENT_ID, FIXTURE_STUDENT_ASSIGNMENTS_LIST, FIXTURE_STUDENT_ASSIGNMENT_DETAILS,
  FIXTURE_STUDENT_ASSIGNMENT_ATTEMPTS, FIXTURE_STUDENT_ASSIGNMENT_DRAFTS
} from './student-assignment-fixture-data';

function ok<T>(body: T): Observable<HttpResponse<T>> {
  return of(new HttpResponse({ status: 200, body })).pipe(delay(150));
}

function errorResponse(status: number, code: string, message: string, url: string): Observable<never> {
  return throwError(() => new HttpErrorResponse({ status, statusText: code, url, error: { code, message, resource: null } })).pipe(delay(120));
}

const ASSIGNMENTS_PATH_RE = new RegExp(`^/account/students/${FIXTURE_ASSIGNMENT_STUDENT_ID}/learning/assignments`);

export const studentAssignmentFixtureInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next) => {
  if (!req.url.startsWith(environment.apiUrl)) return next(req);
  const path = req.url.slice(environment.apiUrl.length).split('?')[0];
  if (!ASSIGNMENTS_PATH_RE.test(path)) return next(req);

  const appMode = sessionStorage.getItem('fixtureScenario');
  if (appMode === 'fullOutage') return errorResponse(503, 'FULL_OUTAGE', 'Assignments are temporarily unavailable.', req.url);
  if (appMode === 'writeFrozen' && req.method !== 'GET') return errorResponse(423, 'WRITE_FROZEN', 'Assignments are temporarily read-only.', req.url);

  if (sessionStorage.getItem('assignmentFixtureFeatureDisabled') === '1') {
    return errorResponse(404, 'LEARNING_CONTENT_NOT_FOUND', 'Assignments are not available.', req.url);
  }

  const listMatch = path.match(/^\/account\/students\/\d+\/learning\/assignments$/);
  if (listMatch && req.method === 'GET') return ok(FIXTURE_STUDENT_ASSIGNMENTS_LIST);

  // UX-7C: Module Detail's Related Assignments -- mirrors the real
  // backend's listByModule() filtering (no status/instance filtering,
  // just scoped to one moduleId).
  const byModuleMatch = path.match(/^\/account\/students\/\d+\/learning\/assignments\/by-module\/(\d+)$/);
  if (byModuleMatch && req.method === 'GET') {
    const moduleId = Number(byModuleMatch[1]);
    return ok(FIXTURE_STUDENT_ASSIGNMENTS_LIST.filter(a => a.moduleId === moduleId));
  }

  const idMatch = path.match(/^\/account\/students\/\d+\/learning\/assignments\/(\d+)$/);
  if (idMatch && req.method === 'GET') {
    const id = Number(idMatch[1]);
    const detail = FIXTURE_STUDENT_ASSIGNMENT_DETAILS[id];
    return detail ? ok(detail) : errorResponse(404, 'RESOURCE_NOT_FOUND', 'StudentAssignment not found', req.url);
  }

  const attemptsMatch = path.match(/^\/account\/students\/\d+\/learning\/assignments\/(\d+)\/attempts$/);
  if (attemptsMatch && req.method === 'GET') {
    const id = Number(attemptsMatch[1]);
    return ok(FIXTURE_STUDENT_ASSIGNMENT_ATTEMPTS[id] ?? []);
  }

  const draftListMatch = path.match(/^\/account\/students\/\d+\/learning\/assignments\/(\d+)\/draft$/);
  if (draftListMatch && req.method === 'GET') {
    const id = Number(draftListMatch[1]);
    return ok(FIXTURE_STUDENT_ASSIGNMENT_DRAFTS[id] ?? (FIXTURE_STUDENT_ASSIGNMENT_DRAFTS[id] = []));
  }

  const draftSaveMatch = path.match(/^\/account\/students\/\d+\/learning\/assignments\/(\d+)\/draft\/(\d+)$/);
  if (draftSaveMatch && req.method === 'PUT') {
    const id = Number(draftSaveMatch[1]);
    const questionId = Number(draftSaveMatch[2]);
    const body = req.body as { textResponse: string | null; selectedOptionIds: number[] | null; expectedDraftRowVersion: number | null };
    const drafts = FIXTURE_STUDENT_ASSIGNMENT_DRAFTS[id] ?? (FIXTURE_STUDENT_ASSIGNMENT_DRAFTS[id] = []);
    const existingIdx = drafts.findIndex(d => d.questionId === questionId);
    if (existingIdx === -1) {
      const created: DraftResponseDTO = { questionId, textResponse: body.textResponse, selectedOptionIds: body.selectedOptionIds ?? [], rowVersion: 0 };
      drafts.push(created);
      return ok(created);
    }
    const existing = drafts[existingIdx];
    if (body.expectedDraftRowVersion !== existing.rowVersion) {
      return errorResponse(409, 'DRAFT_SAVE_CONFLICT', 'This draft answer changed since you last loaded it. Please reload and try again.', req.url);
    }
    const updated: DraftResponseDTO = {
      questionId, textResponse: body.textResponse, selectedOptionIds: body.selectedOptionIds ?? [], rowVersion: existing.rowVersion + 1
    };
    drafts[existingIdx] = updated;
    return ok(updated);
  }

  const submitMatch = path.match(/^\/account\/students\/\d+\/learning\/assignments\/(\d+)\/(submit|resubmit)$/);
  if (submitMatch && req.method === 'POST') {
    const id = Number(submitMatch[1]);
    const isResubmit = submitMatch[2] === 'resubmit';
    const body = req.body as { expectedRowVersion: number };
    const detail = FIXTURE_STUDENT_ASSIGNMENT_DETAILS[id];
    if (!detail) return errorResponse(404, 'RESOURCE_NOT_FOUND', 'StudentAssignment not found', req.url);
    if (detail.rowVersion !== body.expectedRowVersion) {
      return errorResponse(409, 'ASSIGNMENT_STALE', 'This changed since you last loaded it. Please reload and try again.', req.url);
    }
    const drafts = FIXTURE_STUDENT_ASSIGNMENT_DRAFTS[id] ?? [];
    const editableQuestions = detail.questions.filter(q => q.editable);
    const missing = editableQuestions.filter(q => {
      const d = drafts.find(x => x.questionId === q.id);
      if (!d) return true;
      if (q.questionType === 'SINGLE_CHOICE' || q.questionType === 'MULTIPLE_CHOICE') return d.selectedOptionIds.length === 0;
      return !d.textResponse || d.textResponse.trim().length === 0;
    });
    if (missing.length > 0) {
      return errorResponse(400, 'VALIDATION_FAILED', `Question ${missing[0].questionOrder} is not yet answered.`, req.url);
    }

    const priorAttempts = FIXTURE_STUDENT_ASSIGNMENT_ATTEMPTS[id] ?? (FIXTURE_STUDENT_ASSIGNMENT_ATTEMPTS[id] = []);
    const newAttemptNumber = detail.attemptNumber + 1;
    const priorResponses = priorAttempts.find(a => a.attemptNumber === detail.attemptNumber)?.responses ?? [];
    const responses: ResponseSummaryDTO[] = detail.questions.map(q => {
      const d = drafts.find(x => x.questionId === q.id);
      if (d) {
        const outcome: ResponseSummaryDTO['outcome'] = q.questionType === 'SINGLE_CHOICE' || q.questionType === 'MULTIPLE_CHOICE' ? 'AUTO_CORRECT' : null;
        return { questionId: q.id, outcome, textResponse: d.textResponse, selectedOptionIds: d.selectedOptionIds };
      }
      const prior = priorResponses.find(r => r.questionId === q.id);
      return prior ?? { questionId: q.id, outcome: null, textResponse: null, selectedOptionIds: [] };
    });
    priorAttempts.push({ attemptNumber: newAttemptNumber, submittedAt: new Date().toISOString(), reviewDecision: null, reviewedAt: null, reviewedBy: null, feedback: null, responses });

    FIXTURE_STUDENT_ASSIGNMENT_DRAFTS[id] = [];
    const updatedDetail: StudentAssignmentDetailDTO = {
      ...detail, status: 'SUBMITTED', attemptNumber: newAttemptNumber, rowVersion: detail.rowVersion + 1,
      questions: detail.questions.map(q => ({ ...q, editable: false }))
    };
    FIXTURE_STUDENT_ASSIGNMENT_DETAILS[id] = updatedDetail;
    const summary = FIXTURE_STUDENT_ASSIGNMENTS_LIST.find(s => s.id === id);
    if (summary) { summary.status = 'SUBMITTED'; summary.attemptNumber = newAttemptNumber; }
    void isResubmit;
    return ok(updatedDetail);
  }

  return next(req);
};
