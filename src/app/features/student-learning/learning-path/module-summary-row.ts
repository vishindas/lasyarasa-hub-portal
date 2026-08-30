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
 */
@Component({
  selector: 'app-module-summary-row',
  standalone: true,
  imports: [MatIconModule],
  styles: [`
    :host { display: block; }
    /* UX-01 second refinement: 8px is now the standard student-portal card
       radius (architect-approved) -- content/semantics unchanged. */
    .row {
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
      min-height: 44px; padding: 12px 14px; border: 1px solid #E3DCC8; border-radius: 8px; background: #fff;
    }
    .row.navigable { cursor: pointer; }
    .row.navigable:hover, .row.navigable:focus-visible { outline: 2px solid #7A5419; outline-offset: -2px; }
    .row.locked, .row.withdrawn { background: #F3EEDE; color: #6B6255; }
    .title { font-weight: 600; color: #1C1A16; }
    .row.locked .title, .row.withdrawn .title { color: #6B6255; }
    .chip { display: inline-flex; align-items: center; gap: 4px; font-size: 0.75rem; padding: 3px 10px; border-radius: 999px; font-weight: 600; }
    .chip.completed { background: #eef2ff; color: #3730a3; }
    .chip.current { background: #fef3c7; color: #92400e; }
    .chip.available { background: #e0f2fe; color: #075985; }
    .chip.coming-soon { background: #f1f5f9; color: #475569; }
    .chip.withdrawn { background: #fee2e2; color: #991b1b; }
    .inline-note { font-size: 0.8rem; color: #6B6255; margin-top: 4px; }
  `],
  template: `
    <div class="row" [class.navigable]="isNavigable()" [class.locked]="module().status === 'LOCKED'" [class.withdrawn]="module().status === 'WITHDRAWN'"
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
    if (s === 'COMPLETED') return 'completed';
    if (s === 'WITHDRAWN') return 'withdrawn';
    if (s === 'LOCKED') return 'coming-soon';
    return this.isCurrent() ? 'current' : 'available';
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
