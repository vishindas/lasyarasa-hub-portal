import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { StudentFeeApiService } from '../../core/services/student-fee-api.service';
import { StudentFeeDTO, StudentFeeStatus } from '../../core/models/student-fee.model';
import { CurriculumMessageComponent } from '../../shared/curriculum/curriculum-message';
import { CurriculumUiError, toCurriculumUiError } from '../../core/services/curriculum-api-error.util';
import { backLabelFor, navigateForRecovery } from '../student-learning/student-learning-recovery.util';

/**
 * D3: Fees & Balances, reached from the Dashboard's "Fees" card, nested
 * inside the existing StudentLearningShellComponent (same as Dashboard/
 * Class Details) -- inherits the shell's student switcher, class-context
 * bar, and FULL_OUTAGE/offline/lost-access handling for free.
 *
 * One backend call (GET .../students/{studentId}/fees, D3's only endpoint)
 * -- "loading"/"empty"/"full-error" apply to that one call; the resilience
 * this screen actually needs is per-row, not a second independent call:
 * a PARTIAL fee's unknown balance, a fee with no class link, or one with no
 * invoice yet must never block any other fee from rendering correctly.
 *
 * PARTIAL is deliberately never given a numeric outstanding amount --
 * architect-approved contract: the data model cannot determine it
 * (SchoolFee has no paid-amount field; Invoice.amountPaid is an
 * all-or-nothing per-invoice rollup, never a fractional remainder for one
 * fee). Shown as "Partially paid" with the original amount still visible
 * and an explicit "Contact the school for the remaining balance." note --
 * never a guessed number.
 *
 * UX-6: Payment History moved to its own route (student-fee-history.ts) --
 * a paid fee previously appeared twice on this one page (once as a
 * charge/status here, again as a payment transaction below it), which read
 * as duplicative. This page now shows charge/balance records only, with a
 * secondary "View payment history" action linking to the new page. Same
 * underlying GET call and same paidAt/invoiceNumber-based definition of
 * "paid" -- no DTO or endpoint change.
 *
 * No payment button, checkout, staff notes, or editing anywhere -- this is
 * a read-only view, matching the D3 frontend scope exactly.
 */
@Component({
  selector: 'app-student-fees',
  standalone: true,
  // UX-6 geometry correction: was `:host { max-width: 1200px; margin: 0
  // auto; padding: 24px 20px 48px; }` -- the same independently-centered
  // container class of bug already fixed on every other student screen.
  // `.sp-page` (styles-student.scss) gives the same flush gutter, no local
  // width cap, so this screen shares Learning Path's exact left content
  // edge and available width.
  host: { class: 'sp-page' },
  imports: [RouterLink, CurrencyPipe, DatePipe, MatProgressSpinnerModule, MatButtonModule, MatIconModule, CurriculumMessageComponent],
  styles: [`
    /* UX-6: Fraunces retired, matching every other student screen's h1.
       margin-top compensates for this screen's own class-context bar
       being hidden (student-wide, not class-scoped -- see
       student-learning-shell.ts's hideClassContext). The bar occupies
       exactly 65px (measured live: class-context-bar.ts's own .bar --
       10px+10px padding plus its 0.85rem text line-height, plus its 1px
       border-bottom); without this, the heading sits 65px higher than on
       every other student screen, a visible vertical jump when
       navigating here. If class-context-bar.ts's own dimensions ever
       change, this value must be re-measured and updated to match. */
    h1 { font-size: 1.4rem; font-weight: 600; color: var(--sp-text, #1a1f36); margin: 65px 0 20px; }
    /* UX-6: gold eyebrow label retired onto the neutral shared text-muted
       token -- same migration class-info.ts's own .section-title already
       went through (uppercase/letter-spacing/weight kept, color only). */
    .section-title { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--sp-text-muted, #52596b); font-weight: 700; margin: 0; }
    /* UX-6 correction: "View payment history" previously floated in its
       own block between h1 and this section, disconnected from the
       content it actually relates to. Paired into one row instead --
       label left, action right, matching the title-left/action-right
       convention already used throughout Assignments/Learning Path. */
    .section-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin: 0 0 10px; }
    .section-row a { min-height: 44px; }
    .fee-list { display: flex; flex-direction: column; gap: 10px; list-style: none; margin: 0; padding: 0; }
    .fee-row { border: 1px solid var(--sp-border-subtle, #edf0f7); border-radius: var(--sp-radius-sm, 8px); background: var(--sp-surface, #fff); padding: 14px 16px; min-height: 44px; }
    .class-line { margin: 0 0 4px; font-size: 0.8rem; color: var(--sp-text-muted, #52596b); }
    .fee-row-main { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
    .fee-amount { font-weight: 600; color: var(--sp-text, #1a1f36); font-size: 1.05rem; }
    .due-date, .paid-date, .outstanding, .receipt { margin: 6px 0 0; font-size: 0.85rem; color: var(--sp-text-muted, #52596b); }
    .unknown-balance { margin: 6px 0 0; font-size: 0.85rem; color: var(--sp-tone-attention-text, #92400e); }
    .empty-note { color: var(--sp-text-muted, #52596b); font-size: 0.9rem; }
  `],
  template: `
    <h1 tabindex="-1">Fees</h1>

    @if (loadError(); as e) {
      <app-curriculum-message [error]="e" [backLabel]="recoveryLabel(e.kind)" (back)="onBack(e.kind)" />
    } @else if (loading()) {
      <mat-spinner diameter="36" />
    } @else if (fees().length === 0) {
      <p class="empty-note" role="status">No fees on record for this student yet.</p>
    } @else {
      <div class="section-row">
        <p class="section-title" id="fees-balances-heading">Fees & Balances</p>
        <a mat-stroked-button [routerLink]="['/my-students', studentId(), 'fees', 'history']">
          <mat-icon aria-hidden="true">receipt_long</mat-icon> View payment history
        </a>
      </div>
      <ul class="fee-list" aria-labelledby="fees-balances-heading">
        @for (f of fees(); track f.feeId) {
          <li class="fee-row">
            @if (f.className) { <p class="class-line">{{ f.className }}</p> }
            <div class="fee-row-main">
              <span class="fee-amount">{{ f.amount | currency: f.currency }}</span>
              <span class="sp-chip {{ chipToneClass(f.status) }}">{{ statusLabel(f.status) }}</span>
            </div>
            @if (f.dueDate) { <p class="due-date">Due {{ f.dueDate | date: 'mediumDate' }}</p> }
            @if (f.outstandingAmountUnknown) {
              <p class="unknown-balance">Contact the school for the remaining balance.</p>
            } @else if (f.outstandingAmount != null && f.outstandingAmount > 0) {
              <p class="outstanding">{{ f.outstandingAmount | currency: f.currency }} outstanding</p>
            }
          </li>
        }
      </ul>
    }
  `
})
export class StudentFeesComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(StudentFeeApiService);
  private destroyRef = inject(DestroyRef);

  studentId = signal<number>(0);
  fees = signal<StudentFeeDTO[]>([]);
  loading = signal(true);
  loadError = signal<CurriculumUiError | null>(null);

  ngOnInit() {
    const studentId = Number(this.route.snapshot.paramMap.get('studentId'));
    this.studentId.set(studentId);

    this.api.fees(studentId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: fees => { this.loading.set(false); this.fees.set(fees); },
      error: (err: HttpErrorResponse) => { this.loading.set(false); this.loadError.set(toCurriculumUiError(err)); }
    });
  }

  statusLabel(status: StudentFeeStatus): string {
    switch (status) {
      case 'PENDING': return 'Due';
      case 'OVERDUE': return 'Overdue';
      case 'PAID': return 'Paid';
      case 'PARTIAL': return 'Partially paid';
      case 'WAIVED': return 'Waived';
      case 'VOID': return 'Void';
    }
  }

  /** UX-6: migrated onto the shared .sp-chip/.sp-tone-* system -- see styles-student.scss. */
  chipToneClass(status: StudentFeeStatus): string {
    switch (status) {
      case 'PENDING': return 'sp-tone-info';
      case 'OVERDUE': return 'sp-tone-negative';
      case 'PAID': return 'sp-tone-positive';
      case 'PARTIAL': return 'sp-tone-attention';
      case 'WAIVED':
      case 'VOID': return 'sp-tone-neutral';
    }
  }

  recoveryLabel(kind: CurriculumUiError['kind']): string | null {
    return backLabelFor(kind, 'Dashboard');
  }

  onBack(kind: CurriculumUiError['kind']) {
    navigateForRecovery(this.router, kind, this.studentId());
  }
}
