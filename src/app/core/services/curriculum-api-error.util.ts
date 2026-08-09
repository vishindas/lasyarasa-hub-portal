import { HttpErrorResponse } from '@angular/common/http';
import { CurriculumErrorResponse } from '../models/curriculum.model';

/**
 * Maps a failed curriculum-API HTTP response to one of the accepted UI
 * error kinds (approved amendment, point 2). WRITE_FROZEN/FULL_OUTAGE are
 * handled separately by ClassroomLiteModeService via the mode interceptor
 * -- this util still classifies them for completeness (e.g. a screen that
 * wants to show a local message alongside the global banner) but callers
 * generally don't need to branch on those two kinds themselves.
 */
export type CurriculumUiErrorKind =
  | 'conflict'
  | 'illegal-transition'
  | 'validation'
  | 'not-found'
  | 'write-frozen'
  | 'full-outage'
  | 'unknown';

export interface CurriculumUiError {
  kind: CurriculumUiErrorKind;
  message: string;
  resource: string | null;
}

export function toCurriculumUiError(err: HttpErrorResponse): CurriculumUiError {
  const body = (err.error ?? null) as Partial<CurriculumErrorResponse> | null;
  const code = body?.code;
  const resource = body?.resource ?? null;

  switch (code) {
    case 'STALE_VERSION':
      return { kind: 'conflict', message: body?.message || 'This was already updated elsewhere.', resource };
    case 'ILLEGAL_TRANSITION':
      return { kind: 'illegal-transition', message: body?.message || 'This action is no longer available for the current state.', resource };
    case 'VALIDATION_FAILED':
      return { kind: 'validation', message: body?.message || 'Please check the highlighted fields.', resource };
    case 'RESOURCE_NOT_FOUND':
      return { kind: 'not-found', message: body?.message || 'This item is unavailable.', resource };
    case 'WRITE_FROZEN':
      return { kind: 'write-frozen', message: 'Curriculum is temporarily read-only.', resource: null };
    case 'FULL_OUTAGE':
      return { kind: 'full-outage', message: 'Curriculum is temporarily unavailable.', resource: null };
    default:
      // Unknown/malformed server error -- generic, retryable, no internals exposed.
      return { kind: 'unknown', message: 'Something went wrong. Please try again.', resource: null };
  }
}
