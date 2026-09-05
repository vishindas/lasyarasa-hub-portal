import { StudentAssignmentStatus } from '../data-access/student-assignment.model';

export type StudentAssignmentChipTone = 'warning' | 'error' | 'neutral' | 'success';

export interface StudentAssignmentChipVisual {
  label: string;
  tone: StudentAssignmentChipTone;
}

/**
 * Derives the exact student-facing status label the approved Slice 13
 * design specifies. `attemptNumber` distinguishes "Submitted" from
 * "Resubmitted" for a SUBMITTED row -- there is no separate stored
 * RESUBMITTED state (confirmed absent from the real backend's
 * StudentAssignmentStatus enum, matching the design's own correction 4).
 * `unavailable` (instanceStatus === 'WITHDRAWN') overrides every other
 * state -- computed only where instanceStatus is known (Detail), never on
 * Summary, which the real StudentAssignmentSummaryDTO does not carry.
 */
export function studentAssignmentChip(params: {
  status: StudentAssignmentStatus;
  attemptNumber: number;
  overdue: boolean;
  unavailable?: boolean;
}): StudentAssignmentChipVisual {
  if (params.unavailable) return { label: 'Unavailable', tone: 'neutral' };
  switch (params.status) {
    case 'DRAFT':
      return params.overdue ? { label: 'Overdue', tone: 'error' } : { label: 'To do', tone: 'warning' };
    case 'SUBMITTED':
      return params.attemptNumber > 1
        ? { label: 'Resubmitted — awaiting review', tone: 'neutral' }
        : { label: 'Submitted — awaiting review', tone: 'neutral' };
    case 'REVISION_REQUESTED':
      return { label: 'Revise and resubmit', tone: 'warning' };
    case 'VALIDATED':
      return { label: 'Completed', tone: 'success' };
    case 'CLOSED':
      return { label: 'Closed', tone: 'neutral' };
  }
}

/**
 * UX-5/Finding 7: maps this feature's own logical tone (unchanged --
 * still drives the visible label/copy logic above and every existing
 * test) onto the shared `.sp-tone-*` chip system from styles-student.scss
 * (UX-1) for rendering only. Purely additive -- studentAssignmentChip()/
 * outcomeChip() and their consumers are untouched.
 */
export function spToneClass(tone: StudentAssignmentChipTone): string {
  switch (tone) {
    case 'success': return 'sp-tone-positive';
    case 'warning': return 'sp-tone-attention';
    case 'error': return 'sp-tone-negative';
    case 'neutral': return 'sp-tone-neutral';
  }
}

export function isOverdue(dueAt: string, now: Date = new Date()): boolean {
  return !!dueAt && new Date(dueAt).getTime() < now.getTime();
}

const OUTCOME_LABELS: Record<string, { label: string; tone: StudentAssignmentChipTone }> = {
  AUTO_CORRECT: { label: 'Correct', tone: 'success' },
  AUTO_INCORRECT: { label: 'Incorrect', tone: 'error' },
  ACCEPTED: { label: 'Looks good', tone: 'success' },
  NEEDS_REVISION: { label: 'Needs revision', tone: 'warning' }
};

export function outcomeChip(outcome: string | null): StudentAssignmentChipVisual | null {
  if (!outcome) return null;
  return OUTCOME_LABELS[outcome] ?? null;
}
