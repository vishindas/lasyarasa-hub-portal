import { Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

export type CurriculumChipState =
  | 'DRAFT' | 'ACTIVE' | 'ARCHIVED'          // CurriculumVersionStatus / ModuleContentStatus (DRAFT/ARCHIVED shared)
  | 'PUBLISHED'                               // ModuleContentStatus
  | 'LOCKED' | 'RELEASED' | 'COMPLETED' | 'WITHDRAWN'; // ClassModuleStatus

interface ChipVisual { label: string; icon: string; tone: string; }

// Labels/icons per Foundation v1.1 Part VI (State Language) and Slice 3 §6.4
// (never color-only -- every chip pairs an icon with its text label). ACTIVE
// and COMPLETED are not literal Foundation Part VI rows (that table is
// lesson/assignment-oriented); their copy/icon here is a direct, unambiguous
// reading of Slice 3 (Figure 2 lifecycle rail; §1.4 "Complete marks a module
// class-delivery-finished") -- flagged for confirmation against the Slice 3
// prototype during visual QA, not blocking.
const VISUALS: Record<CurriculumChipState, ChipVisual> = {
  DRAFT:      { label: 'Draft',     icon: 'edit',          tone: 'neutral' },
  ACTIVE:     { label: 'Active',    icon: 'check_circle',  tone: 'success' },
  PUBLISHED:  { label: 'Published', icon: 'check_circle',  tone: 'success' },
  ARCHIVED:   { label: 'Archived',  icon: 'archive',       tone: 'muted' },
  LOCKED:     { label: 'Locked',    icon: 'lock',          tone: 'locked' },
  RELEASED:   { label: 'Released',  icon: 'lock_open',     tone: 'success' },
  COMPLETED:  { label: 'Completed', icon: 'task_alt',      tone: 'info' },
  WITHDRAWN:  { label: 'Withdrawn', icon: 'remove_circle',  tone: 'muted' }
};

@Component({
  selector: 'app-status-chip-curriculum',
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
export class StatusChipCurriculumComponent {
  state = input.required<CurriculumChipState>();
  visual = computed(() => VISUALS[this.state()]);
}
