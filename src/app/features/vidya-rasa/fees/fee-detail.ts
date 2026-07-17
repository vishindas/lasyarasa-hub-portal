import { Component, inject, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { CurrencyPipe, DatePipe, TitleCasePipe } from '@angular/common';
import { CurrencyService } from '../../../core/services/currency.service';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { environment } from '../../../../environments/environment';
import { Fee } from '../../../core/models/fee.model';
import { FeeFormDialog, FeeDialogData } from './fee-form-dialog';
import { FeeTier } from '../../../core/models/settings.model';

@Component({
  selector: 'app-fee-detail',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, TitleCasePipe, MatButtonModule, MatIconModule,
            MatCardModule, MatDividerModule, MatDialogModule, MatSnackBarModule],
  styles: [`
    .detail-grid { display: grid; grid-template-columns: 1fr 1.4fr; gap: 16px; }
    .section-label {
      font-size: 0.72rem; font-weight: 700; letter-spacing: 0.07em;
      text-transform: uppercase; color: #6c757d; margin: 0 0 14px;
    }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px; }
    .info-item { display: flex; flex-direction: column; }
    .info-label { font-size: 0.72rem; color: #adb5bd; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
    .info-value { font-size: 0.88rem; color: #1a1f36; margin-top: 3px; font-weight: 500; }
    .info-value.large { font-size: 1.15rem; font-weight: 800; color: #3d4ed8; }
    .tier-row { display: flex; justify-content: space-between; font-size: 0.875rem;
                padding: 8px 0; border-bottom: 1px solid #f3f4f6; color: #374151; }
    .tier-row:last-child { border-bottom: none; }
    .notes-text { font-size: 0.875rem; color: #374151; line-height: 1.6; margin: 0; white-space: pre-wrap; }
    @media (max-width: 768px) { .detail-grid { grid-template-columns: 1fr; } }
  `],
  template: `
    @if (fee(); as f) {
      <div class="page-header">
        <div style="display:flex;align-items:center;gap:6px">
          <button mat-icon-button (click)="goBack()" title="Back to Fees">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <div>
            <h2 style="margin:0">{{ f.studentName }}</h2>
            <p class="page-subtitle" style="margin:4px 0 0">
              <span class="status-chip status-{{ f.status.toLowerCase() }}">{{ f.status | titlecase }}</span>
              &nbsp;·&nbsp;Due {{ f.dueDate | date:'mediumDate' }}
              @if (f.feeTierLabel) { &nbsp;·&nbsp;{{ f.feeTierLabel }} }
            </p>
          </div>
        </div>
        <div style="display:flex;gap:8px">
          @if (f.status === 'PENDING' || f.status === 'OVERDUE') {
            <button mat-stroked-button (click)="waive(f)" style="color:#94a3b8;border-color:#94a3b8">
              <mat-icon>money_off</mat-icon> Waive
            </button>
            <button mat-flat-button color="primary" (click)="markPaid(f)">
              <mat-icon>check_circle</mat-icon> Mark Paid
            </button>
          }
          <button mat-stroked-button (click)="openEdit(f)">
            <mat-icon>edit</mat-icon> Edit
          </button>
        </div>
      </div>

      <div class="detail-grid">

        <!-- Left: fee financials -->
        <mat-card>
          <mat-card-content style="padding-top:16px">
            <p class="section-label">Fee Details</p>
            <div class="info-grid">
              <div class="info-item" style="grid-column:1/-1">
                <span class="info-label">Amount</span>
                <span class="info-value large">{{ f.amount | currency:cs.currency():'symbol':'1.0-0' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Due Date</span>
                <span class="info-value">{{ f.dueDate | date:'mediumDate' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Status</span>
                <span class="info-value">
                  <span class="status-chip status-{{ f.status.toLowerCase() }}">{{ f.status | titlecase }}</span>
                </span>
              </div>
              <div class="info-item">
                <span class="info-label">Paid On</span>
                <span class="info-value">{{ f.paidAt ? (f.paidAt | date:'mediumDate') : '—' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Paid By</span>
                <span class="info-value">{{ f.paidBy || '—' }}</span>
              </div>
            </div>

            @if (f.notes) {
              <mat-divider style="margin:16px 0"></mat-divider>
              <p class="section-label">Notes</p>
              <p class="notes-text">{{ f.notes }}</p>
            }
          </mat-card-content>
        </mat-card>

        <!-- Right: student + fee tiers -->
        <div style="display:flex;flex-direction:column;gap:16px">

          <mat-card>
            <mat-card-content style="padding-top:16px">
              <p class="section-label">Student</p>
              <div class="info-grid">
                <div class="info-item" style="grid-column:1/-1">
                  <span class="info-label">Name</span>
                  <span class="info-value" style="font-weight:700;font-size:1rem">{{ f.studentName }}</span>
                </div>
                @if (f.guardianNames?.length) {
                  <div class="info-item" style="grid-column:1/-1">
                    <span class="info-label">Guardian(s)</span>
                    <span class="info-value">{{ f.guardianNames!.join(', ') }}</span>
                  </div>
                }
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card>
            <mat-card-content style="padding-top:16px">
              <p class="section-label">Fee Tier{{ (f.feeTiers?.length ?? 0) > 1 ? 's' : '' }}</p>
              @if (f.feeTiers && f.feeTiers.length > 1) {
                @for (t of f.feeTiers; track t.tierId) {
                  <div class="tier-row">
                    <span>{{ t.tierLabel }}</span>
                    <span style="font-weight:600">{{ t.amount | currency:cs.currency():'symbol':'1.0-0' }}</span>
                  </div>
                }
                <div class="tier-row" style="font-weight:700;border-top:2px solid #e5e7eb;margin-top:4px;padding-top:10px;border-bottom:none">
                  <span>Total</span>
                  <span style="color:#3d4ed8">{{ f.amount | currency:cs.currency():'symbol':'1.0-0' }}</span>
                </div>
              } @else {
                <div class="info-grid">
                  <div class="info-item" style="grid-column:1/-1">
                    <span class="info-label">Tier</span>
                    <span class="info-value">{{ f.feeTierLabel || '—' }}</span>
                  </div>
                </div>
              }
            </mat-card-content>
          </mat-card>

        </div>
      </div>

    } @else {
      <p style="color:#adb5bd;padding:32px 0">Loading…</p>
    }
  `
})
export class FeeDetailComponent implements OnInit {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  cs = inject(CurrencyService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  fee = signal<Fee | null>(null);
  feeTiers = signal<FeeTier[]>([]);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.load(id);
    this.http.get<FeeTier[]>(`${environment.apiUrl}/school/settings/fee-tiers`)
      .subscribe(d => this.feeTiers.set(d));
  }

  load(id: string) {
    this.http.get<Fee>(`${environment.apiUrl}/school/fees/${id}`)
      .subscribe(d => this.fee.set(d));
  }

  goBack() {
    this.router.navigate(['/vidya-rasa/fees']);
  }

  openEdit(fee: Fee) {
    const data: FeeDialogData = { fee, feeTiers: this.feeTiers() };
    this.dialog.open(FeeFormDialog, { width: '480px', data })
      .afterClosed().subscribe(saved => {
        if (saved) {
          this.load(String(fee.id));
          this.snack.open('Fee saved', 'OK', { duration: 2500 });
        }
      });
  }

  markPaid(fee: Fee) {
    const data: FeeDialogData = {
      fee: { ...fee, status: 'PAID', paidAt: new Date().toISOString().slice(0, 10) },
      feeTiers: this.feeTiers()
    };
    this.dialog.open(FeeFormDialog, { width: '480px', data })
      .afterClosed().subscribe(saved => {
        if (saved) {
          this.load(String(fee.id));
          this.snack.open('Marked as paid', 'OK', { duration: 2500 });
        }
      });
  }

  waive(fee: Fee) {
    if (!confirm(`Waive fee for ${fee.studentName}?`)) return;
    this.http.put(`${environment.apiUrl}/school/fees/${fee.id}`, { ...fee, status: 'WAIVED' })
      .subscribe(() => {
        this.load(String(fee.id));
        this.snack.open('Fee waived', 'OK', { duration: 2500 });
      });
  }
}
