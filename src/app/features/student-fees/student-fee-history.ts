import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { StudentFeeApiService } from '../../core/services/student-fee-api.service';
import { StudentFeeDTO } from '../../core/models/student-fee.model';
import { CurriculumMessageComponent } from '../../shared/curriculum/curriculum-message';
import { CurriculumUiError, toCurriculumUiError } from '../../core/services/curriculum-api-error.util';
import { backLabelFor, navigateForRecovery } from '../student-learning/student-learning-recovery.util';

/**
 * UX-6: Payment History, split off Fees' own page -- a paid fee previously
 * appeared twice on one screen (once as a charge/status in Fees & Balances,
 * again as a payment transaction below it), which read as duplicative.
 * Reuses the exact same GET .../fees call Fees itself uses, filtered by the
 * same paidAt/invoiceNumber definition of "paid" Fees' own paymentHistory
 * computed already used -- no new endpoint, no new DTO, no behavior change
 * to what counts as a payment. Transaction records only: no status chip,
 * no due-date/outstanding-balance fields -- this is not a fee-status card.
 */
@Component({
  selector: 'app-student-fee-history',
  standalone: true,
  host: { class: 'sp-page' },
  imports: [RouterLink, CurrencyPipe, DatePipe, MatProgressSpinnerModule, MatIconModule, CurriculumMessageComponent],
  styles: [`
    /* UX-6: margin-top compensates for this screen's own class-context bar
       being hidden (student-wide, not class-scoped) -- see the identical
       fix/comment on student-fees.ts's own h1. Applied here instead of to
       h1 since .back-link is this page's first element. */
    .back-link { display: inline-flex; align-items: center; gap: 4px; color: var(--sp-text-muted, #52596b); text-decoration: none; font-size: 0.85rem; margin: 65px 0 8px; min-height: 44px; }
    .back-link:hover, .back-link:focus-visible { color: var(--sp-primary, #3d4ed8); outline: 2px solid var(--sp-primary, #3d4ed8); outline-offset: -2px; }
    h1 { font-size: 1.4rem; font-weight: 600; color: var(--sp-text, #1a1f36); margin: 0 0 20px; }
    .payment-list { display: flex; flex-direction: column; gap: 10px; list-style: none; margin: 0; padding: 0; }
    .payment-row { border: 1px solid var(--sp-border-subtle, #edf0f7); border-radius: var(--sp-radius-sm, 8px); background: var(--sp-surface, #fff); padding: 14px 16px; min-height: 44px; }
    .class-line { margin: 0 0 4px; font-size: 0.8rem; color: var(--sp-text-muted, #52596b); }
    .payment-row-main { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
    .payment-amount { font-weight: 600; color: var(--sp-text, #1a1f36); font-size: 1.05rem; }
    .paid-date { margin: 0; font-size: 0.85rem; color: var(--sp-text-muted, #52596b); }
    .receipt { margin: 6px 0 0; font-size: 0.85rem; color: var(--sp-text-muted, #52596b); }
    .empty-note { color: var(--sp-text-muted, #52596b); font-size: 0.9rem; }
  `],
  template: `
    <a class="back-link" [routerLink]="['/my-students', studentId(), 'fees']">
      <mat-icon aria-hidden="true">arrow_back</mat-icon> Back to Fees
    </a>

    <h1 tabindex="-1">Payment History</h1>

    @if (loadError(); as e) {
      <app-curriculum-message [error]="e" [backLabel]="recoveryLabel(e.kind)" (back)="onBack(e.kind)" />
    } @else if (loading()) {
      <mat-spinner diameter="36" />
    } @else if (payments().length === 0) {
      <p class="empty-note" role="status">No payments recorded yet.</p>
    } @else {
      <ul class="payment-list" aria-label="Payment history">
        @for (p of payments(); track p.feeId) {
          <li class="payment-row">
            @if (p.className) { <p class="class-line">{{ p.className }}</p> }
            <div class="payment-row-main">
              <span class="payment-amount">{{ p.amount | currency: p.currency }}</span>
              @if (p.paidAt) { <span class="paid-date">Paid {{ p.paidAt | date: 'mediumDate' }}</span> }
            </div>
            @if (p.invoiceNumber) { <p class="receipt">Receipt {{ p.invoiceNumber }}</p> }
          </li>
        }
      </ul>
    }
  `
})
export class StudentFeeHistoryComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(StudentFeeApiService);
  private destroyRef = inject(DestroyRef);

  studentId = signal<number>(0);
  /** Only fees with an actual recorded payment or receipt -- never allocated/inferred amounts. */
  payments = signal<StudentFeeDTO[]>([]);
  loading = signal(true);
  loadError = signal<CurriculumUiError | null>(null);

  ngOnInit() {
    const studentId = Number(this.route.snapshot.paramMap.get('studentId'));
    this.studentId.set(studentId);

    this.api.fees(studentId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: fees => {
        this.loading.set(false);
        this.payments.set(fees.filter(f => f.paidAt != null || f.invoiceNumber != null));
      },
      error: (err: HttpErrorResponse) => { this.loading.set(false); this.loadError.set(toCurriculumUiError(err)); }
    });
  }

  recoveryLabel(kind: CurriculumUiError['kind']): string | null {
    return backLabelFor(kind, 'Dashboard');
  }

  onBack(kind: CurriculumUiError['kind']) {
    navigateForRecovery(this.router, kind, this.studentId());
  }
}
