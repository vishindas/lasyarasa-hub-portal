import { HttpErrorResponse } from '@angular/common/http';
import { toCurriculumUiError } from './curriculum-api-error.util';

function errorFor(code: string | undefined, message = 'msg', resource: string | null = 'X'): HttpErrorResponse {
  return new HttpErrorResponse({ error: code ? { code, message, resource } : null, status: 0 });
}

describe('toCurriculumUiError', () => {
  it('maps STALE_VERSION to conflict', () => {
    expect(toCurriculumUiError(errorFor('STALE_VERSION')).kind).toBe('conflict');
  });

  it('maps ILLEGAL_TRANSITION to illegal-transition, not a generic "updated elsewhere" message', () => {
    const e = toCurriculumUiError(errorFor('ILLEGAL_TRANSITION', 'This class has since migrated to a different curriculum.'));
    expect(e.kind).toBe('illegal-transition');
    expect(e.message).toBe('This class has since migrated to a different curriculum.');
  });

  it('maps VALIDATION_FAILED to validation', () => {
    expect(toCurriculumUiError(errorFor('VALIDATION_FAILED')).kind).toBe('validation');
  });

  it('maps RESOURCE_NOT_FOUND to not-found, never permission-denied wording', () => {
    const e = toCurriculumUiError(errorFor('RESOURCE_NOT_FOUND'));
    expect(e.kind).toBe('not-found');
    expect(e.message.toLowerCase()).not.toContain('permission');
  });

  it('maps WRITE_FROZEN to write-frozen with a fixed message', () => {
    expect(toCurriculumUiError(errorFor('WRITE_FROZEN')).kind).toBe('write-frozen');
  });

  it('maps FULL_OUTAGE to full-outage with a fixed message', () => {
    expect(toCurriculumUiError(errorFor('FULL_OUTAGE')).kind).toBe('full-outage');
  });

  it('maps an unknown or malformed body to unknown without exposing internals', () => {
    const e = toCurriculumUiError(errorFor(undefined));
    expect(e.kind).toBe('unknown');
    expect(e.message).not.toContain('undefined');
    expect(e.resource).toBeNull();
  });

  // Slice 12 -- architect correction 1: the three Slice 11 errors must map
  // to three DISTINCT kinds, never collapsed into one.
  describe('the three Slice 11 typed errors (correction 1: never collapsed)', () => {
    it('maps STUDENT_CONTEXT_UNAVAILABLE to its own kind with generic, non-leaking copy', () => {
      const e = toCurriculumUiError(errorFor('STUDENT_CONTEXT_UNAVAILABLE', 'Student context is unavailable.', 'Student'));
      expect(e.kind).toBe('student-context-unavailable');
      expect(e.message.toLowerCase()).not.toContain('revoked');
      expect(e.message.toLowerCase()).not.toContain('guardian');
    });

    it('maps CLASS_CONTEXT_UNAVAILABLE to its own kind, distinct from student-context-unavailable', () => {
      const e = toCurriculumUiError(errorFor('CLASS_CONTEXT_UNAVAILABLE', 'Class context is unavailable.', 'SchoolClass'));
      expect(e.kind).toBe('class-context-unavailable');
      expect(e.kind).not.toBe('student-context-unavailable');
    });

    it('maps LEARNING_CONTENT_NOT_FOUND to its own kind, distinct from the other two', () => {
      const e = toCurriculumUiError(errorFor('LEARNING_CONTENT_NOT_FOUND', 'The requested learning content was not found.', 'StudentLearning'));
      expect(e.kind).toBe('learning-content-not-found');
      expect(e.kind).not.toBe('student-context-unavailable');
      expect(e.kind).not.toBe('class-context-unavailable');
    });

    it('all three kinds are pairwise distinct string values', () => {
      const kinds = [
        toCurriculumUiError(errorFor('STUDENT_CONTEXT_UNAVAILABLE')).kind,
        toCurriculumUiError(errorFor('CLASS_CONTEXT_UNAVAILABLE')).kind,
        toCurriculumUiError(errorFor('LEARNING_CONTENT_NOT_FOUND')).kind
      ];
      expect(new Set(kinds).size).toBe(3);
    });

    it('none of the three ever exposes a resource id or backend detail in the message', () => {
      for (const code of ['STUDENT_CONTEXT_UNAVAILABLE', 'CLASS_CONTEXT_UNAVAILABLE', 'LEARNING_CONTENT_NOT_FOUND']) {
        const e = toCurriculumUiError(errorFor(code, 'irrelevant backend message', 'SomeResource'));
        expect(e.message).not.toMatch(/\d{3,}/); // no id-shaped number leaked into the fixed generic copy
      }
    });
  });
});
