import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ClassroomLiteModeService } from './classroom-lite-mode.service';
import { CurriculumErrorResponse } from '../models/curriculum.model';

/** Mirrors the backend's own route scoping (ClassroomLiteWebConfig): curricula/**, classes/*\/curriculum-assignment/**, classes/*\/modules/**. */
const CURRICULUM_PATH_RE = /\/school\/(curricula(\/|$)|classes\/[^/]+\/(curriculum-assignment|modules)(\/|$))/;
/**
 * Slice 12: mirrors ClassroomLiteWebConfig's STUDENT_LEARNING_PATH_PATTERN
 * (/api/account/students/*\/learning/**) exactly -- deliberately scoped to
 * the /learning sub-path, not the bare /account/students prefix, for the
 * same reason the backend comment gives: the broader form would also catch
 * the pre-existing GET /account/students (My Students) call, which must
 * never be treated as gated by this feature's operating mode.
 */
const STUDENT_LEARNING_PATH_RE = /\/account\/students\/[^/]+\/learning(\/|$)/;

export const curriculumModeInterceptor: HttpInterceptorFn = (req, next) => {
  if (!CURRICULUM_PATH_RE.test(req.url) && !STUDENT_LEARNING_PATH_RE.test(req.url)) {
    return next(req);
  }
  const modeService = inject(ClassroomLiteModeService);
  return next(req).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse) {
        const code = (err.error as Partial<CurriculumErrorResponse> | null)?.code;
        if (err.status === 423 || code === 'WRITE_FROZEN') {
          modeService.setWriteFrozen();
        } else if (err.status === 503 || code === 'FULL_OUTAGE') {
          modeService.setFullOutage();
        }
      }
      return throwError(() => err);
    })
  );
};
