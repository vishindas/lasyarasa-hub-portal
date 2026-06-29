import { Component, inject, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { CurrencyService } from '../../../core/services/currency.service';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule } from '@angular/material/table';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { environment } from '../../../../environments/environment';
import { Invoice } from '../../../core/models/invoice.model';
import { EditInvoiceDialog } from './edit-invoice-dialog';
import { VoidInvoiceDialog } from './void-invoice-dialog';

@Component({
  selector: 'app-invoice-detail',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, DecimalPipe, MatButtonModule, MatIconModule, MatCardModule,
            MatDividerModule, MatTableModule, MatDialogModule, MatSnackBarModule],
  styles: [`
    .detail-grid { display: grid; grid-template-columns: 1fr 1.5fr; gap: 16px; }
    .section-label {
      font-size: 0.72rem; font-weight: 700; letter-spacing: 0.07em;
      text-transform: uppercase; color: #6c757d; margin: 0 0 12px;
    }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 24px; }
    .info-item { display: flex; flex-direction: column; }
    .info-label { font-size: 0.72rem; color: #adb5bd; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
    .info-value { font-size: 0.88rem; color: #1a1f36; margin-top: 2px; }
    .balance-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 10px 0 0; margin-top: 10px; border-top: 2px solid #eef0fb;
    }
    .balance-label { font-size: 0.82rem; font-weight: 700; color: #1a1f36; text-transform: uppercase; letter-spacing: 0.05em; }
    .balance-amount { font-size: 1.15rem; font-weight: 800; color: #3d4ed8; }
    .balance-paid { color: #16a34a; }
    .line-table { width: 100%; }
    .line-table-total {
      display: flex; justify-content: flex-end; padding: 10px 16px 0;
      font-weight: 700; font-size: 0.92rem; color: #1a1f36; gap: 32px;
      border-top: 1px solid #eef0fb; margin-top: 4px;
    }
    .void-banner {
      display: flex; gap: 12px; align-items: flex-start;
      background: #fef2f2; border: 1px solid #ef4444; border-radius: 8px;
      padding: 12px 16px; margin-bottom: 16px; color: #7f1d1d;
      mat-icon { flex-shrink: 0; margin-top: 2px; }
      strong { font-size: 0.88rem; }
      p { margin: 4px 0 0; font-size: 0.83rem; }
    }
    @media (max-width: 768px) { .detail-grid { grid-template-columns: 1fr; } }
  `],
  template: `
    @if (invoice(); as inv) {

      <div class="page-header">
        <div style="display:flex;align-items:center;gap:6px">
          <button mat-icon-button (click)="goBack()" title="Back to Invoices">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <div>
            <h2 style="margin:0;font-family:monospace">{{ inv.invoiceNumber }}</h2>
            <p class="page-subtitle" style="margin:4px 0 0">
              <span class="status-chip status-{{ inv.status.toLowerCase() }}">{{ inv.status }}</span>
              &nbsp;·&nbsp;Period {{ inv.period }}
              &nbsp;·&nbsp;Issued {{ inv.issueDate | date:'mediumDate' }}
            </p>
          </div>
        </div>
        <div style="display:flex;gap:8px">
          @if (canSend(inv)) {
            <button mat-flat-button color="primary" [disabled]="sending()" (click)="sendInvoice(inv)">
              <mat-icon>send</mat-icon> {{ sending() ? 'Sending…' : 'Send Invoice' }}
            </button>
          }
          @if (canRemind(inv)) {
            <button mat-stroked-button (click)="sendReminder(inv)" style="color:#f59e0b;border-color:#f59e0b">
              <mat-icon>notifications_active</mat-icon> Send Reminder
            </button>
          }
          @if (inv.status !== 'VOID') {
            <button mat-stroked-button (click)="openEdit(inv)">
              <mat-icon>edit</mat-icon> Edit
            </button>
          }
          @if (canVoid(inv)) {
            <button mat-stroked-button color="warn" (click)="openVoid(inv)">
              <mat-icon>block</mat-icon> Void
            </button>
          }
          @if (canDelete(inv)) {
            <button mat-stroked-button color="warn" (click)="deleteDraft(inv)">
              <mat-icon>delete</mat-icon> Delete
            </button>
          }
        </div>
      </div>

      <!-- void reason banner -->
      @if (inv.status === 'VOID') {
        <div class="void-banner">
          <mat-icon>block</mat-icon>
          <div>
            <strong>This invoice has been voided.</strong>
            @if (inv.voidReason) {
              <p>Reason: {{ inv.voidReason }}</p>
            }
            @if (inv.voidedAt) {
              <p style="margin:2px 0 0;font-size:0.78rem;opacity:.7">{{ inv.voidedAt | date:'medium' }}</p>
            }
          </div>
        </div>
      }

      <div class="detail-grid">

        <!-- Left column -->
        <div style="display:flex;flex-direction:column;gap:16px">

          <mat-card>
            <mat-card-content style="padding-top:16px">
              <p class="section-label">Invoice Details</p>
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">Issue Date</span>
                  <span class="info-value">{{ inv.issueDate | date:'mediumDate' }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Due Date</span>
                  <span class="info-value">{{ inv.dueDate ? (inv.dueDate | date:'mediumDate') : '—' }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Period</span>
                  <span class="info-value">{{ inv.period }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Total Amount</span>
                  <span class="info-value" style="font-weight:700">{{ inv.totalAmount | currency:cs.currency():'symbol':'1.0-0' }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Amount Paid</span>
                  <span class="info-value" style="color:#16a34a;font-weight:600">{{ inv.amountPaid | currency:cs.currency():'symbol':'1.0-0' }}</span>
                </div>
              </div>

              <div class="balance-row">
                <span class="balance-label">Balance Due</span>
                <span class="balance-amount"
                      [class.balance-paid]="(inv.totalAmount - inv.amountPaid) <= 0">
                  {{ (inv.totalAmount - inv.amountPaid) | currency:cs.currency():'symbol':'1.0-0' }}
                </span>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card>
            <mat-card-content style="padding-top:16px">
              <p class="section-label">Billed To</p>
              <div class="info-grid">
                <div class="info-item" style="grid-column:1/-1">
                  <span class="info-label">Name</span>
                  <span class="info-value" style="font-weight:600">{{ inv.payerName || '—' }}</span>
                </div>
                <div class="info-item" style="grid-column:1/-1">
                  <span class="info-label">Email</span>
                  <span class="info-value">{{ inv.sentTo || '—' }}</span>
                </div>
              </div>
            </mat-card-content>
          </mat-card>

        </div>

        <!-- Right column -->
        <mat-card>
          <mat-card-content style="padding-top:16px">
            <p class="section-label">Line Items ({{ inv.lineItems?.length || 0 }})</p>

            @if (inv.lineItems?.length) {
              <table mat-table [dataSource]="inv.lineItems" class="line-table full-width">

                <ng-container matColumnDef="description">
                  <th mat-header-cell *matHeaderCellDef style="font-size:0.72rem;font-weight:700;color:#6c757d">Description</th>
                  <td mat-cell *matCellDef="let item" style="font-size:0.88rem;color:#1a1f36">
                    {{ item.description }}
                  </td>
                </ng-container>

                <ng-container matColumnDef="amount">
                  <th mat-header-cell *matHeaderCellDef style="font-size:0.72rem;font-weight:700;color:#6c757d;text-align:right">Amount</th>
                  <td mat-cell *matCellDef="let item" style="text-align:right;font-size:0.88rem;font-weight:600;color:#3d4ed8">
                    {{ item.amount | currency:cs.currency():'symbol':'1.0-0' }}
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="lineColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: lineColumns;"></tr>
              </table>

              <div class="line-table-total">
                <span style="color:#6c757d">Total</span>
                <span>{{ inv.totalAmount | currency:cs.currency():'symbol':'1.0-0' }}</span>
              </div>
            } @else {
              <p style="font-size:0.82rem;color:#adb5bd;margin:0">No line items on this invoice.</p>
            }
          </mat-card-content>
        </mat-card>

      </div>

    } @else {
      <p style="color:#adb5bd;padding:32px 0">Loading…</p>
    }
  `
})
export class InvoiceDetailComponent implements OnInit {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  cs = inject(CurrencyService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  invoice = signal<Invoice | null>(null);
  sending = signal(false);
  lineColumns = ['description', 'amount'];

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.load(id);
  }

  load(id: string) {
    this.http.get<Invoice>(`${environment.apiUrl}/school/invoices/${id}`)
      .subscribe(d => this.invoice.set(d));
  }

  canDelete(inv: Invoice)  { return inv.status === 'DRAFT'; }
  canVoid(inv: Invoice)    { return ['SENT', 'OVERDUE', 'PAID', 'PARTIAL'].includes(inv.status); }
  canSend(inv: Invoice)    { return inv.status === 'DRAFT' && !!inv.sentTo; }
  canRemind(inv: Invoice)  { return ['SENT', 'OVERDUE', 'PARTIAL'].includes(inv.status) && !!inv.sentTo; }

  sendInvoice(inv: Invoice) {
    if (this.sending()) return;
    this.sending.set(true);
    this.http.post<Invoice>(`${environment.apiUrl}/school/invoices/${inv.id}/send`, {})
      .subscribe({
        next: () => {
          this.sending.set(false);
          this.snack.open(`Invoice sent to ${inv.sentTo}`, 'OK', { duration: 3000 });
          this.load(String(inv.id));
        },
        error: () => {
          this.sending.set(false);
          this.snack.open('Failed to send invoice', 'OK', { duration: 3000 });
        }
      });
  }

  sendReminder(inv: Invoice) {
    this.http.post<Invoice>(`${environment.apiUrl}/school/invoices/${inv.id}/remind`, {})
      .subscribe({
        next: () => this.snack.open(`Reminder sent to ${inv.sentTo}`, 'OK', { duration: 3000 }),
        error: () => this.snack.open('Failed to send reminder', 'OK', { duration: 3000 })
      });
  }

  openVoid(inv: Invoice) {
    this.dialog.open(VoidInvoiceDialog, { width: '520px', data: inv })
      .afterClosed().subscribe(result => {
        if (!result) return;
        this.http.post(`${environment.apiUrl}/school/invoices/${inv.id}/void`, { reason: result.reason })
          .subscribe({
            next: () => {
              this.snack.open('Invoice voided', 'OK', { duration: 3000 });
              this.load(String(inv.id));
            },
            error: () => this.snack.open('Failed to void invoice', 'OK', { duration: 3000 })
          });
      });
  }

  deleteDraft(inv: Invoice) {
    if (!confirm(`Delete draft invoice ${inv.invoiceNumber}?`)) return;
    this.http.delete(`${environment.apiUrl}/school/invoices/${inv.id}`)
      .subscribe({
        next: () => {
          this.snack.open('Invoice deleted', 'OK', { duration: 3000 });
          this.router.navigate(['/vidya-rasa/invoices']);
        },
        error: () => this.snack.open('Failed to delete invoice', 'OK', { duration: 3000 })
      });
  }

  openEdit(inv: Invoice) {
    this.dialog.open(EditInvoiceDialog, { width: '520px', data: inv })
      .afterClosed().subscribe(changes => {
        if (!changes) return;
        this.http.put<Invoice>(`${environment.apiUrl}/school/invoices/${inv.id}`, changes)
          .subscribe({
            next: () => {
              this.snack.open('Invoice updated', 'OK', { duration: 3000 });
              this.load(String(inv.id));
            },
            error: () => this.snack.open('Failed to update invoice', 'OK', { duration: 3000 })
          });
      });
  }

  goBack() {
    this.router.navigate(['/vidya-rasa/invoices']);
  }
}
