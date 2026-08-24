import { HttpErrorResponse } from '@angular/common/http';
import { AssignmentErrorResponse } from '../../../core/models/assignment.model';

/**
 * Student-assignment domain error mapper. Mirrors
 * core/services/assignment-api-error.util.ts's (staff) shape and
 * core/services/curriculum-api-error.util.ts's 'learning-content-not-found'
 * kind/copy, but is its own, self-contained file: the staff util lives
 * outside this feature's import boundary in spirit (it is not itself
 * answer-key-bearing, but keeping this domain's error handling entirely
 * self-contained under features/student-assignments/** avoids any
 * incidental coupling to the staff module as this feature evolves).
 * Imports only AssignmentErrorResponse, a neutral core model with no
 * answer-key field.
 */
export type StudentAssignmentUiErrorKind =
  | 'stale-version'
  | 'illegal-transition'
  | 'validation'
  | 'not-found'
  | 'draft-conflict'
  | 'write-frozen'
  | 'full-outage'
  | 'feature-unavailable'
  | 'unknown';

export interface StudentAssignmentUiError {
  kind: StudentAssignmentUiErrorKind;
  message: string;
  resource: string | null;
}

export function toStudentAssignmentUiError(err: HttpErrorResponse): StudentAssignmentUiError {
  const body = (err.error ?? null) as Partial<AssignmentErrorResponse> | null;
  const code = body?.code;
  const resource = body?.resource ?? null;

  switch (code) {
    case 'STALE_VERSION':
    case 'ASSIGNMENT_STALE':
      return { kind: 'stale-version', message: 'This changed since you last loaded it. Please reload and try again.', resource };
    case 'ILLEGAL_TRANSITION':
      return { kind: 'illegal-transition', message: body?.message || 'This action is no longer available for the current state.', resource };
    case 'VALIDATION_FAILED':
      return { kind: 'validation', message: body?.message || 'Please check your answer and try again.', resource };
    case 'DRAFT_SAVE_CONFLICT':
      return { kind: 'draft-conflict', message: 'This answer changed since you last loaded it. Please reload and try again.', resource };
    case 'RESOURCE_NOT_FOUND':
      // Same shape as "genuinely doesn't exist" by design -- see
      // AssignmentResourceNotFoundException's own doc comment; never
      // distinguishable from cross-student/cross-provider access.
      return { kind: 'not-found', message: "This assignment isn't available. It may be locked, withdrawn, or you switched students.", resource };
    case 'LEARNING_CONTENT_NOT_FOUND':
      // Feature globally/provider-disabled -- distinguishable from
      // RESOURCE_NOT_FOUND by this code, not by HTTP status (both 404).
      return { kind: 'feature-unavailable', message: 'Assignments are not available right now.', resource: null };
    case 'WRITE_FROZEN':
      return { kind: 'write-frozen', message: 'Assignments are temporarily read-only.', resource: null };
    case 'FULL_OUTAGE':
      return { kind: 'full-outage', message: 'Assignments are temporarily unavailable.', resource: null };
    default:
      if (err.status === 423) return { kind: 'write-frozen', message: 'Assignments are temporarily read-only.', resource: null };
      if (err.status === 503) return { kind: 'full-outage', message: 'Assignments are temporarily unavailable.', resource: null };
      if (err.status === 404) return { kind: 'not-found', message: "This assignment isn't available.", resource: null };
      return { kind: 'unknown', message: 'Something went wrong. Please try again.', resource: null };
  }
}
