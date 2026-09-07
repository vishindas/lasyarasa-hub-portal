import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ClassroomLiteModeService } from '../../../core/services/classroom-lite-mode.service';
import { StudentAssignmentSummaryDTO } from '../../student-assignments/data-access/student-assignment.model';
import { isOverdue, spToneClass, studentAssignmentChip } from '../../student-assignments/shared/student-assignment-status.util';

/**
 * UX-7C's compact row for Module Detail's Related Assignments section --
 * same chip/CTA language as student-assignment-summary.ts's full row
 * (reuses its exact studentAssignmentChip/spToneClass/isOverdue functions,
 * the one part of that screen's per-row logic already factored into a
 * shared util), but deliberately smaller and with no "Module: X" line --
 * the student is already inside that module, so repeating its name here
 * would be redundant context (UX-7C spec). secondaryLabel/ctaLabel/
 * ctaDisabled are intentionally NOT extracted from
 * student-assignment-summary.ts: that component has no equivalent
 * sub-component of its own to import (its row markup is inline), so this
 * is the same one-copy-per-component shape that screen already uses, not a
 * new duplication pattern.
 */
@Component({
  selector: 'app-related-assignment-row',
  standalone: true,
  imports: [RouterLink],
  styles: [`
    .row {
      display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 6px 10px;
      min-height: 44px; padding: 10px 12px;
      border: 1px solid var(--sp-border-subtle, #edf0f7); border-radius: var(--sp-radius-sm, 8px); background: var(--sp-surface, #fff);
    }
    .row-main { min-width: 100px; flex: 1 1 100px; }
    .row-title { font-weight: 600; font-size: 0.9rem; color: var(--sp-text, #1a1f36); margin: 0; }
    .row-due { font-size: 0.78rem; color: var(--sp-text-muted, #52596b); margin: 2px 0 0; }
    .row-meta { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
    .row-action {
      display: inline-flex; align-items: center; justify-content: center; min-height: 36px; padding: 0 12px;
      border: 1px solid var(--sp-border-subtle, #edf0f7); border-radius: var(--sp-radius-sm, 8px);
      color: var(--sp-primary, #3d4ed8); text-decoration: none; font-size: 0.82rem; font-weight: 600;
    }
    .row-action:hover, .row-action:focus-visible { outline: 2px solid var(--sp-primary, #3d4ed8); outline-offset: -2px; }
    .row-action[aria-disabled="true"] { color: var(--sp-text-faint, #9ba3b8); pointer-events: none; }
    .frozen-note { font-size: 0.72rem; color: var(--sp-text-muted, #52596b); margin: 4px 0 0; }
    @media (max-width: 599px) {
      .row { flex-direction: column; align-items: stretch; }
      .row-main { flex: 1 1 auto; min-width: 0; }
    }
  `],
  template: `
    <div class="row">
      <div class="row-main">
        <p class="row-title">{{ assignment().title }}</p>
        @if (secondaryLabel(); as s) { <p class="row-due">{{ s }}</p> }
      </div>
      <div class="row-meta">
        <span class="sp-chip {{ spToneClass(chip().tone) }}">{{ chip().label }}</span>
        <a class="row-action" [routerLink]="['/my-students', studentId(), 'assignments', assignment().id]"
           [attr.aria-disabled]="ctaDisabled() || null" [tabIndex]="ctaDisabled() ? -1 : 0"
           (click)="onClick($event)">
          {{ ctaLabel() }}
        </a>
      </div>
    </div>
    @if (ctaDisabled()) {
      <p class="frozen-note">Read-only for now</p>
    }
  `
})
export class RelatedAssignmentRowComponent {
  private mode = inject(ClassroomLiteModeService);
  protected readonly spToneClass = spToneClass;

  assignment = input.required<StudentAssignmentSummaryDTO>();
  studentId = input.required<number>();

  private overdue(): boolean {
    const a = this.assignment();
    return a.status === 'DRAFT' && isOverdue(a.dueAt);
  }

  chip() {
    const a = this.assignment();
    return studentAssignmentChip({ status: a.status, attemptNumber: a.attemptNumber, overdue: this.overdue() });
  }

  secondaryLabel(): string | null {
    const a = this.assignment();
    if (a.status !== 'DRAFT' || this.overdue()) return null;
    return `Due ${new Date(a.dueAt).toLocaleDateString()}`;
  }

  ctaLabel(): string {
    switch (this.assignment().status) {
      case 'DRAFT': return 'Start';
      case 'REVISION_REQUESTED': return 'Revise and resubmit';
      default: return 'View';
    }
  }

  ctaDisabled(): boolean {
    const status = this.assignment().status;
    return this.mode.mutationsDisabled() && (status === 'DRAFT' || status === 'REVISION_REQUESTED');
  }

  onClick(event: Event) {
    if (this.ctaDisabled()) event.preventDefault();
  }
}
