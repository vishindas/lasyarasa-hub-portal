import { Component, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ModuleSummaryDTO } from '../../../core/models/student-learning.model';

/**
 * Part II.2's module row + state chip. Correction 6, locked: WITHDRAWN is
 * its own distinct chip/copy, never LOCKED's "Coming soon" -- and neither
 * ever navigates into Module Detail. Tap/focus on a non-navigable row
 * shows an inline note in place (per Part II.2's "Module tap target" row)
 * rather than doing nothing silently, so the reason is legible.
 *
 * D2 correction: COMPLETED reads "Completed for class," never plain
 * "Completed" -- the deployed model only records class-level module
 * completion (ClassModuleState), with no per-student lesson-progress
 * state at all. Plain "Completed" would misleadingly imply personal
 * progress that doesn't exist. This is the only student-facing chip
 * text for module status (reused unchanged by both Learning Path and
 * Class Details), so fixing it here fixes it everywhere.
 *
 * UX-3: recolored onto the shared `.sp-chip`/`.sp-tone-*` foundation
 * (styles-student.scss, established in UX-1) instead of this component's
 * own bespoke five-color chip palette -- chipClass() now returns a tone
 * name from that shared system. Mapping follows the audit's semantic
 * grouping (green=positive/completed, amber=pending/attention/current,
 * blue=informational/available, slate=neutral/inactive/locked,
 * red=negative/withdrawn); chip text/icon/navigation behavior are
 * unchanged. The current module additionally gets a left-border/
 * background tint on the row itself (wireframe 4) -- the one place a
 * slightly stronger "where you are" treatment is warranted.
 */
@Component({
  selector: 'app-module-summary-row',
  standalone: true,
  imports: [MatIconModule],
  styles: [`
    :host { display: block; }
    .row {
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
      min-height: 44px; padding: 12px 14px; border: 1px solid var(--sp-border-subtle, #edf0f7);
      border-radius: var(--sp-radius-sm, 8px); background: var(--sp-surface, #fff);
    }
    .row.navigable { cursor: pointer; }
    .row.navigable:hover, .row.navigable:focus-visible { outline: 2px solid var(--sp-primary, #3d4ed8); outline-offset: -2px; }
    .row.locked, .row.withdrawn { background: var(--sp-tone-neutral-bg, #f1f5f9); color: var(--sp-text-muted, #52596b); }
    .row.current { border-left: 3px solid var(--sp-primary, #3d4ed8); background: var(--sp-primary-bg, #eef0fb); }
    .title { font-weight: 600; color: var(--sp-text, #1a1f36); }
    .row.locked .title, .row.withdrawn .title { color: var(--sp-text-muted, #52596b); }
    .chip { display: inline-flex; align-items: center; gap: 4px; font-size: 0.75rem; padding: 3px 10px; border-radius: 999px; font-weight: 600; }
    .chip.sp-tone-positive  { background: var(--sp-tone-positive-bg, #d1fae5);  color: var(--sp-tone-positive-text, #065f46); }
    .chip.sp-tone-attention { background: var(--sp-tone-attention-bg, #fef3c7); color: var(--sp-tone-attention-text, #92400e); }
    .chip.sp-tone-info      { background: var(--sp-tone-info-bg, #e0f2fe);     color: var(--sp-tone-info-text, #075985); }
    .chip.sp-tone-neutral   { background: var(--sp-tone-neutral-bg, #f1f5f9); color: var(--sp-tone-neutral-text, #64748b); }
    .chip.sp-tone-negative  { background: var(--sp-tone-negative-bg, #fee2e2); color: var(--sp-tone-negative-text, #991b1b); }
    .inline-note { font-size: 0.8rem; color: var(--sp-text-muted, #52596b); margin-top: 4px; }
  `],
  template: `
    <div class="row" [class.navigable]="isNavigable()" [class.locked]="module().status === 'LOCKED'" [class.withdrawn]="module().status === 'WITHDRAWN'" [class.current]="isCurrent()"
         tabindex="0" role="button" [attr.aria-label]="module().title"
         (click)="onActivate()" (keydown.enter)="onActivate()" (keydown.space)="onActivate()">
      <span class="title">{{ module().title }}</span>
      <span class="chip" [class]="chipClass()">
        <mat-icon aria-hidden="true" style="font-size:14px;width:14px;height:14px">{{ chipIcon() }}</mat-icon>
        {{ chipText() }}
      </span>
    </div>
    @if (showNote()) {
      <p class="inline-note">
        @if (module().status === 'WITHDRAWN') { This module is no longer available. }
        @else { This module isn't released yet. }
      </p>
    }
  `
})
export class ModuleSummaryRowComponent {
  private router = inject(Router);

  module = input.required<ModuleSummaryDTO>();
  isCurrent = input(false);
  studentId = input.required<number>();
  classId = input.required<number>();

  showNote = signal(false);

  isNavigable(): boolean {
    return this.module().status === 'RELEASED' || this.module().status === 'COMPLETED';
  }

  chipClass(): string {
    const s = this.module().status;
    if (s === 'COMPLETED') return 'sp-tone-positive';
    if (s === 'WITHDRAWN') return 'sp-tone-negative';
    if (s === 'LOCKED') return 'sp-tone-neutral';
    return this.isCurrent() ? 'sp-tone-attention' : 'sp-tone-info';
  }

  chipIcon(): string {
    const s = this.module().status;
    if (s === 'COMPLETED') return 'check_circle';
    if (s === 'WITHDRAWN') return 'block';
    if (s === 'LOCKED') return 'lock';
    return this.isCurrent() ? 'play_circle' : 'radio_button_unchecked';
  }

  chipText(): string {
    const s = this.module().status;
    if (s === 'COMPLETED') return 'Completed for class';
    if (s === 'WITHDRAWN') return 'Withdrawn';
    if (s === 'LOCKED') return 'Coming soon';
    return this.isCurrent() ? 'Current' : 'Available';
  }

  onActivate(): void {
    if (this.isNavigable()) {
      this.router.navigate(['/my-students', this.studentId(), 'classes', this.classId(), 'modules', this.module().moduleId]);
      return;
    }
    // LOCKED or WITHDRAWN: inline note only, never navigate -- correction 6.
    this.showNote.set(true);
  }
}
