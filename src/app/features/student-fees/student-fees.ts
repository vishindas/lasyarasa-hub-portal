import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { StudentFeeApiService } from '../../core/services/student-fee-api.service';
import { StudentFeeDTO, StudentFeeStatus } from '../../core/models/student-fee.model';
import { CurriculumMessageComponent } from '../../shared/curriculum/curriculum-message';
import { CurriculumUiError, toCurriculumUiError } from '../../core/services/curriculum-api-error.util';
import { backLabelFor, navigateForRecovery } from '../student-learning/student-learning-recovery.util';

/**
 * D3: Fee Summary + Payment History, reached from the Dashboard's "Fees"
 * card, nested inside the existing StudentLearningShellComponent (same as
 * Dashboard/Class Details) -- inherits the shell's student switcher,
 * class-context bar, and FULL_OUTAGE/offline/lost-access handling for free.
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
 * Payment History shows only fees with an actual paidAt date and/or a real
 * invoice number already on the DTO -- nothing here allocates an
 * invoice-level amount onto an individual fee or infers a partial-paid
 * figure.
 *
 * No payment button, checkout, staff notes, or editing anywhere -- this is
 * a read-only view, matching the D3 frontend scope exactly.
 */
@Component({
  selector: 'app-student-fees',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, MatProgressSpinnerModule, CurriculumMessageComponent],
  styles: [`
    /* UX-01 refinement: widened from 720px -- container only, the fee
       list itself is unchanged ahead of its own future redesign slice. */
    :host { display: block; max-width: 1200px; margin: 0 auto; padding: 24px 20px 48px; }
    h1 { font-family: Fraunces, Georgia, serif; font-size: 1.5rem; color: #1C1A16; margin: 0 0 20px; }
    .section-title { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em; color: #A3762C; font-weight: 700; margin: 28px 0 10px; }
    .section-title:first-of-type { margin-top: 0; }
    .fee-list { display: flex; flex-direction: column; gap: 10px; list-style: none; margin: 0; padding: 0; }
    .fee-row { border: 1px solid #E3DCC8; border-radius: 8px; background: #fff; padding: 14px 16px; min-height: 44px; }
    .class-line { margin: 0 0 4px; font-size: 0.8rem; color: #6B6255; }
    .fee-row-main { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
    .fee-amount { font-weight: 600; color: #1C1A16; font-size: 1.05rem; }
    .chip { display: inline-flex; align-items: center; font-size: 0.75rem; padding: 3px 10px; border-radius: 999px; font-weight: 600; }
    .chip.paid { background: #eef2ff; color: #3730a3; }
    .chip.due { background: #e0f2fe; color: #075985; }
    .chip.overdue { background: #fee2e2; color: #991b1b; }
    .chip.partial { background: #fef3c7; color: #92400e; }
    .chip.waived, .chip.void { background: #f1f5f9; color: #475569; }
    .due-date, .paid-date, .outstanding, .receipt { margin: 6px 0 0; font-size: 0.85rem; color: #6B6255; }
    .unknown-balance { margin: 6px 0 0; font-size: 0.85rem; color: #92400e; }
    .empty-note { color: #6B6255; font-size: 0.9rem; }
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
      <p class="section-title" id="fee-summary-heading">Fee Summary</p>
      <ul class="fee-list" aria-labelledby="fee-summary-heading">
        @for (f of fees(); track f.feeId) {
          <li class="fee-row">
            @if (f.className) { <p class="class-line">{{ f.className }}</p> }
            <div class="fee-row-main">
              <span class="fee-amount">{{ f.amount | currency: f.currency }}</span>
              <span class="chip" [class]="chipClass(f.status)">{{ statusLabel(f.status) }}</span>
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

      <p class="section-title" id="payment-history-heading">Payment History</p>
      @if (paymentHistory().length === 0) {
        <p class="empty-note">No payments recorded yet.</p>
      } @else {
        <ul class="fee-list" aria-labelledby="payment-history-heading">
          @for (p of paymentHistory(); track p.feeId) {
            <li class="fee-row">
              @if (p.className) { <p class="class-line">{{ p.className }}</p> }
              <div class="fee-row-main">
                <span class="fee-amount">{{ p.amount | currency: p.currency }}</span>
                @if (p.paidAt) { <span class="paid-date">Paid {{ p.paidAt | date: 'mediumDate' }}</span> }
              </div>
              @if (p.invoiceNumber) { <p class="receipt">Receipt {{ p.invoiceNumber }}</p> }
            </li>
          }
        </ul>
      }
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

  /** Only fees with an actual recorded payment or receipt -- never allocated/inferred amounts. */
  paymentHistory = computed(() => this.fees().filter(f => f.paidAt != null || f.invoiceNumber != null));

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

  chipClass(status: StudentFeeStatus): string {
    switch (status) {
      case 'PENDING': return 'due';
      case 'OVERDUE': return 'overdue';
      case 'PAID': return 'paid';
      case 'PARTIAL': return 'partial';
      case 'WAIVED': return 'waived';
      case 'VOID': return 'void';
    }
  }

  recoveryLabel(kind: CurriculumUiError['kind']): string | null {
    return backLabelFor(kind, 'Dashboard');
  }

  onBack(kind: CurriculumUiError['kind']) {
    navigateForRecovery(this.router, kind, this.studentId());
  }
}
