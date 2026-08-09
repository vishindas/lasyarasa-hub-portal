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
});
