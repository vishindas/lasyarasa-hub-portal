import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ClassroomLiteModeService } from './classroom-lite-mode.service';
import { CurriculumErrorResponse } from '../models/curriculum.model';

/** Mirrors the backend's own route scoping (ClassroomLiteWebConfig): curricula/**, classes/*\/curriculum-assignment/**, classes/*\/modules/**. */
const CURRICULUM_PATH_RE = /\/school\/(curricula(\/|$)|classes\/[^/]+\/(curriculum-assignment|modules)(\/|$))/;

export const curriculumModeInterceptor: HttpInterceptorFn = (req, next) => {
  if (!CURRICULUM_PATH_RE.test(req.url)) {
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
