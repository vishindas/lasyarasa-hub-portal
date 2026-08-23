import { HttpErrorResponse } from '@angular/common/http';
import { AssignmentErrorResponse } from '../models/assignment.model';

/** Mirrors curriculum-api-error.util.ts's toCurriculumUiError() for the assignment-domain error codes (Slice 14/14.1). */
export type AssignmentUiErrorKind =
  | 'stale-version'
  | 'illegal-transition'
  | 'validation'
  | 'not-found'
  | 'idempotency-conflict'
  | 'write-frozen'
  | 'full-outage'
  | 'unknown';

export interface AssignmentUiError {
  kind: AssignmentUiErrorKind;
  message: string;
  resource: string | null;
}

export function toAssignmentUiError(err: HttpErrorResponse): AssignmentUiError {
  const body = (err.error ?? null) as Partial<AssignmentErrorResponse> | null;
  const code = body?.code;
  const resource = body?.resource ?? null;

  switch (code) {
    case 'STALE_VERSION':
    case 'ASSIGNMENT_STALE':
      return {
        kind: 'stale-version',
        message: 'This changed since you opened it — someone else may have edited or validated it. Reload before continuing.',
        resource
      };
    case 'ILLEGAL_TRANSITION':
      return { kind: 'illegal-transition', message: body?.message || 'This action is no longer available for the current state.', resource };
    case 'VALIDATION_FAILED':
      return { kind: 'validation', message: body?.message || 'Please check the highlighted fields.', resource };
    case 'RESOURCE_NOT_FOUND':
      return { kind: 'not-found', message: body?.message || 'This item is unavailable.', resource };
    case 'IDEMPOTENCY_KEY_CONFLICT':
      return { kind: 'idempotency-conflict', message: 'This action may have already been processed differently — reload and check the instance list.', resource: null };
    case 'WRITE_FROZEN':
      return { kind: 'write-frozen', message: 'Assignments are temporarily read-only.', resource: null };
    case 'FULL_OUTAGE':
      return { kind: 'full-outage', message: 'Assignments are temporarily unavailable.', resource: null };
    default:
      if (err.status === 423) return { kind: 'write-frozen', message: 'Assignments are temporarily read-only.', resource: null };
      if (err.status === 503) return { kind: 'full-outage', message: 'Assignments are temporarily unavailable.', resource: null };
      return { kind: 'unknown', message: 'Something went wrong. Please try again.', resource: null };
  }
}
