import { Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

export type AssignmentChipState =
  | 'DRAFT' | 'PUBLISHED' | 'PUBLISHED_WITH_DRAFT' | 'ARCHIVED'   // template displayStatus
  | 'ACTIVE' | 'CLOSED' | 'WITHDRAWN'                              // AssignmentInstanceStatus
  | 'SUBMITTED' | 'REVISION_REQUESTED' | 'VALIDATED';              // StudentAssignmentStatus (DRAFT/CLOSED shared with the groups above)

interface ChipVisual { label: string; icon: string; tone: string; }

/** Mirrors shared/curriculum/status-chip-curriculum.ts's shape exactly (5 tones, icon+label, never color-only). */
const VISUALS: Record<AssignmentChipState, ChipVisual> = {
  DRAFT:                 { label: 'Draft',              icon: 'edit',          tone: 'neutral' },
  PUBLISHED:              { label: 'Published',           icon: 'check_circle',  tone: 'success' },
  PUBLISHED_WITH_DRAFT:    { label: 'Published (editing)',  icon: 'edit_note',     tone: 'info' },
  ARCHIVED:               { label: 'Archived',            icon: 'archive',       tone: 'muted' },
  ACTIVE:                 { label: 'Active',              icon: 'check_circle',  tone: 'success' },
  CLOSED:                 { label: 'Closed',              icon: 'lock',          tone: 'locked' },
  WITHDRAWN:              { label: 'Withdrawn',           icon: 'remove_circle', tone: 'muted' },
  SUBMITTED:              { label: 'Submitted',           icon: 'upload_file',   tone: 'info' },
  REVISION_REQUESTED:      { label: 'Revision requested',  icon: 'flag',          tone: 'neutral' },
  VALIDATED:              { label: 'Validated',           icon: 'verified',      tone: 'success' }
};

@Component({
  selector: 'app-status-chip-assignment',
  standalone: true,
  imports: [MatIconModule],
  styles: [`
    .chip {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 3px 10px 3px 8px; border-radius: 20px;
      font-size: 0.72rem; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase;
      white-space: nowrap;
    }
    mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .tone-neutral { background: #f1f5f9; color: #475569; }
    .tone-success { background: #d1fae5; color: #065f46; }
    .tone-muted   { background: #f1f5f9; color: #64748b; }
    .tone-locked  { background: #e2e8f0; color: #334155; }
    .tone-info    { background: #e0f2fe; color: #0369a1; }
  `],
  template: `
    <span class="chip tone-{{ visual().tone }}">
      <mat-icon aria-hidden="true">{{ visual().icon }}</mat-icon>
      {{ visual().label }}
    </span>
  `
})
export class StatusChipAssignmentComponent {
  state = input.required<AssignmentChipState>();
  visual = computed(() => VISUALS[this.state()]);
}
