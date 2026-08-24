import { HttpErrorResponse } from '@angular/common/http';
import { toStudentAssignmentUiError } from './student-assignment-ui-error.util';

function errorOf(status: number, body: unknown): HttpErrorResponse {
  return new HttpErrorResponse({ status, url: 'http://x/test', error: body });
}

describe('toStudentAssignmentUiError', () => {
  it('maps ASSIGNMENT_STALE and STALE_VERSION to stale-version', () => {
    expect(toStudentAssignmentUiError(errorOf(409, { code: 'ASSIGNMENT_STALE', resource: 'StudentAssignment' })).kind).toBe('stale-version');
    expect(toStudentAssignmentUiError(errorOf(409, { code: 'STALE_VERSION', resource: 'StudentAssignment' })).kind).toBe('stale-version');
  });

  it('maps DRAFT_SAVE_CONFLICT to draft-conflict', () => {
    expect(toStudentAssignmentUiError(errorOf(409, { code: 'DRAFT_SAVE_CONFLICT' })).kind).toBe('draft-conflict');
  });

  it('maps ILLEGAL_TRANSITION to illegal-transition, preserving the server message', () => {
    const e = toStudentAssignmentUiError(errorOf(409, { code: 'ILLEGAL_TRANSITION', message: 'This question is not open for revision.' }));
    expect(e.kind).toBe('illegal-transition');
    expect(e.message).toBe('This question is not open for revision.');
  });

  it('maps VALIDATION_FAILED to validation', () => {
    expect(toStudentAssignmentUiError(errorOf(400, { code: 'VALIDATION_FAILED', message: 'Question 1 is not yet answered.' })).kind).toBe('validation');
  });

  it('maps RESOURCE_NOT_FOUND to not-found with generic, non-leaking copy', () => {
    const e = toStudentAssignmentUiError(errorOf(404, { code: 'RESOURCE_NOT_FOUND', resource: 'StudentAssignment' }));
    expect(e.kind).toBe('not-found');
    expect(e.message).not.toContain('StudentAssignment not found'); // never echoes the raw backend message verbatim
  });

  it('maps LEARNING_CONTENT_NOT_FOUND to feature-unavailable, distinct from RESOURCE_NOT_FOUND despite both being 404', () => {
    const e = toStudentAssignmentUiError(errorOf(404, { code: 'LEARNING_CONTENT_NOT_FOUND' }));
    expect(e.kind).toBe('feature-unavailable');
    expect(e.kind).not.toBe('not-found');
  });

  it('maps WRITE_FROZEN (423) and FULL_OUTAGE (503) by code', () => {
    expect(toStudentAssignmentUiError(errorOf(423, { code: 'WRITE_FROZEN' })).kind).toBe('write-frozen');
    expect(toStudentAssignmentUiError(errorOf(503, { code: 'FULL_OUTAGE' })).kind).toBe('full-outage');
  });

  it('falls back to status-based classification when the body has no recognized code', () => {
    expect(toStudentAssignmentUiError(errorOf(423, {})).kind).toBe('write-frozen');
    expect(toStudentAssignmentUiError(errorOf(503, {})).kind).toBe('full-outage');
    expect(toStudentAssignmentUiError(errorOf(404, {})).kind).toBe('not-found');
    expect(toStudentAssignmentUiError(errorOf(500, {})).kind).toBe('unknown');
  });

  it('never surfaces an isCorrect/correct-option marker in any mapped message, for any input', () => {
    const bodies = [
      { code: 'ASSIGNMENT_STALE' }, { code: 'DRAFT_SAVE_CONFLICT' }, { code: 'ILLEGAL_TRANSITION', message: 'x' },
      { code: 'VALIDATION_FAILED', message: 'x' }, { code: 'RESOURCE_NOT_FOUND' }, { code: 'LEARNING_CONTENT_NOT_FOUND' }
    ];
    for (const body of bodies) {
      const e = toStudentAssignmentUiError(errorOf(400, body));
      expect(JSON.stringify(e).toLowerCase()).not.toContain('iscorrect');
      expect(JSON.stringify(e).toLowerCase()).not.toContain('correctoption');
    }
  });
});
