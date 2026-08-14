import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { StudentAccessLossService } from './student-access-loss.service';
import { CurriculumErrorResponse } from '../models/curriculum.model';

/**
 * Observes STUDENT_CONTEXT_UNAVAILABLE responses reactively (same pattern
 * as curriculumModeInterceptor for FULL_OUTAGE/WRITE_FROZEN) and records
 * the affected studentId, extracted from the request URL itself --
 * /api/account/students/{studentId}/learning/**. Still rethrows: a screen
 * that wants its own inline handling (e.g. via toCurriculumUiError) is
 * unaffected; StudentLearningShellComponent is what actually turns this
 * into the full-page takeover, and only when the id matches the student
 * currently routed to (Part III.1's precedence note).
 */
export const studentLearningAccessInterceptor: HttpInterceptorFn = (req, next) => {
  const match = req.url.match(/\/account\/students\/(\d+)\/learning(\/|$)/);
  if (!match) {
    return next(req);
  }
  const requestedStudentId = Number(match[1]);
  const lossService = inject(StudentAccessLossService);

  return next(req).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse) {
        const code = (err.error as Partial<CurriculumErrorResponse> | null)?.code;
        if (err.status === 404 && code === 'STUDENT_CONTEXT_UNAVAILABLE') {
          lossService.markLost(requestedStudentId);
        }
      }
      return throwError(() => err);
    })
  );
};
