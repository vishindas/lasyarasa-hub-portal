import { isOverdue, outcomeChip, studentAssignmentChip } from './student-assignment-status.util';

describe('studentAssignmentChip', () => {
  it('DRAFT + not overdue -> "To do"', () => {
    expect(studentAssignmentChip({ status: 'DRAFT', attemptNumber: 0, overdue: false })).toEqual({ label: 'To do', tone: 'warning' });
  });

  it('DRAFT + overdue -> "Overdue"', () => {
    expect(studentAssignmentChip({ status: 'DRAFT', attemptNumber: 0, overdue: true })).toEqual({ label: 'Overdue', tone: 'error' });
  });

  it('SUBMITTED + attemptNumber 1 -> "Submitted — awaiting review"', () => {
    expect(studentAssignmentChip({ status: 'SUBMITTED', attemptNumber: 1, overdue: false }).label).toBe('Submitted — awaiting review');
  });

  it('SUBMITTED + attemptNumber > 1 -> "Resubmitted — awaiting review" (no RESUBMITTED stored state exists)', () => {
    expect(studentAssignmentChip({ status: 'SUBMITTED', attemptNumber: 2, overdue: false }).label).toBe('Resubmitted — awaiting review');
  });

  it('REVISION_REQUESTED -> "Revise and resubmit"', () => {
    expect(studentAssignmentChip({ status: 'REVISION_REQUESTED', attemptNumber: 1, overdue: false }).label).toBe('Revise and resubmit');
  });

  it('VALIDATED -> "Completed"', () => {
    expect(studentAssignmentChip({ status: 'VALIDATED', attemptNumber: 1, overdue: false }).label).toBe('Completed');
  });

  it('CLOSED -> "Closed"', () => {
    expect(studentAssignmentChip({ status: 'CLOSED', attemptNumber: 0, overdue: false }).label).toBe('Closed');
  });

  it('unavailable overrides every other state, regardless of status', () => {
    expect(studentAssignmentChip({ status: 'VALIDATED', attemptNumber: 1, overdue: false, unavailable: true })).toEqual({ label: 'Unavailable', tone: 'neutral' });
    expect(studentAssignmentChip({ status: 'DRAFT', attemptNumber: 0, overdue: true, unavailable: true }).label).toBe('Unavailable');
  });
});

describe('isOverdue', () => {
  it('is true when dueAt is in the past relative to the given now', () => {
    expect(isOverdue('2026-01-01T00:00:00', new Date('2026-06-01T00:00:00'))).toBe(true);
  });

  it('is false when dueAt is in the future relative to the given now', () => {
    expect(isOverdue('2026-12-01T00:00:00', new Date('2026-06-01T00:00:00'))).toBe(false);
  });
});

describe('outcomeChip', () => {
  it('maps every real outcome value to a label+tone, never color alone (a tone is always present)', () => {
    expect(outcomeChip('AUTO_CORRECT')).toEqual({ label: 'Correct', tone: 'success' });
    expect(outcomeChip('AUTO_INCORRECT')).toEqual({ label: 'Incorrect', tone: 'error' });
    expect(outcomeChip('ACCEPTED')).toEqual({ label: 'Looks good', tone: 'success' });
    expect(outcomeChip('NEEDS_REVISION')).toEqual({ label: 'Needs revision', tone: 'warning' });
  });

  it('returns null for a null/ungraded outcome -- no badge is shown rather than a fabricated one', () => {
    expect(outcomeChip(null)).toBeNull();
  });
});
