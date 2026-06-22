import { Component, inject } from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Invoice } from '../../../core/models/invoice.model';

const STATUS_TRANSITIONS: Record<string, { value: string; label: string }[]> = {
  DRAFT:   [{ value: 'DRAFT', label: 'Draft' }, { value: 'SENT', label: 'Sent' },
            { value: 'PAID', label: 'Paid' }, { value: 'PARTIAL', label: 'Partial' },
            { value: 'OVERDUE', label: 'Overdue' }],
  SENT:    [{ value: 'SENT', label: 'Sent' }, { value: 'PAID', label: 'Paid' },
            { value: 'PARTIAL', label: 'Partial' }, { value: 'OVERDUE', label: 'Overdue' }],
  OVERDUE: [{ value: 'OVERDUE', label: 'Overdue' }, { value: 'PAID', label: 'Paid' },
            { value: 'PARTIAL', label: 'Partial' }],
  PARTIAL: [{ value: 'PARTIAL', label: 'Partial' }, { value: 'PAID', label: 'Paid' },
            { value: 'OVERDUE', label: 'Overdue' }],
  PAID:    [{ value: 'PAID', label: 'Paid' }],
  VOID:    [{ value: 'VOID', label: 'Void' }],
};

@Component({
  selector: 'app-edit-invoice-dialog',
  standalone: true,
  imports: [DecimalPipe, DatePipe, ReactiveFormsModule, MatDialogModule, MatButtonModule,
            MatFormFieldModule, MatInputModule, MatSelectModule, MatDatepickerModule,
            MatNativeDateModule, MatIconModule, MatDividerModule],
  template: `
    <h2 mat-dialog-title>Edit Invoice</h2>

    <mat-dialog-content>

      <!-- read-only summary -->
      <div class="inv-summary">
        <div class="inv-summary-row">
          <span class="inv-summary-label">Invoice #</span>
          <span class="inv-summary-value mono">{{ data.invoiceNumber }}</span>
        </div>
        <div class="inv-summary-row">
          <span class="inv-summary-label">Payer</span>
          <span class="inv-summary-value">{{ data.payerName }}</span>
        </div>
        <div class="inv-summary-row">
          <span class="inv-summary-label">Period</span>
          <span class="inv-summary-value">{{ data.period }}</span>
        </div>
        <div class="inv-summary-row">
          <span class="inv-summary-label">Total</span>
          <span class="inv-summary-value" style="font-weight:700;color:#3d4ed8">
            ₹{{ data.totalAmount | number:'1.0-0' }}
          </span>
        </div>
      </div>

      <!-- line items -->
      @if (data.lineItems?.length) {
        <div class="inv-line-items">
          @for (item of data.lineItems; track item.id) {
            <div class="inv-line-item">
              <span>{{ item.description }}</span>
              <span>₹{{ item.amount | number:'1.0-0' }}</span>
            </div>
          }
        </div>
      }

      <mat-divider style="margin: 16px 0"></mat-divider>

      <!-- editable fields -->
      <form [formGroup]="form" class="dialog-form">

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Status</mat-label>
          <mat-select formControlName="status" [disabled]="data.status === 'PAID'">
            @for (opt of allowedStatuses; track opt.value) {
              <mat-option [value]="opt.value">{{ opt.label }}</mat-option>
            }
          </mat-select>
          @if (data.status === 'PAID') {
            <mat-hint>Status is locked for paid invoices. Use Void to cancel.</mat-hint>
          }
        </mat-form-field>

        <div class="form-row-2">
          <mat-form-field appearance="outline">
            <mat-label>Amount Paid (₹)</mat-label>
            <input matInput type="number" min="0" formControlName="amountPaid" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Due Date</mat-label>
            <input matInput [matDatepicker]="picker" formControlName="dueDate">
            <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
            <mat-datepicker #picker></mat-datepicker>
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Send To (email)</mat-label>
          <input matInput type="email" formControlName="sentTo" />
          <mat-icon matSuffix style="color:#9ca3af">email</mat-icon>
        </mat-form-field>

      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button color="primary" [disabled]="form.invalid" (click)="save()">
        Save Changes
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .inv-summary {
      background: #f4f5fb;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .inv-summary-row { display: flex; justify-content: space-between; font-size: 0.88rem; }
    .inv-summary-label { color: #6c757d; }
    .inv-summary-value { font-weight: 500; color: #1a1f36; }
    .mono { font-family: monospace; }

    .inv-line-items {
      border: 1px solid #e8eaf0;
      border-radius: 6px;
      overflow: hidden;
    }
    .inv-line-item {
      display: flex;
      justify-content: space-between;
      padding: 6px 12px;
      font-size: 0.83rem;
      color: #495057;
      border-bottom: 1px solid #f0f1f5;
      &:last-child { border-bottom: none; }
    }
  `]
})
export class EditInvoiceDialog {
  data: Invoice = inject(MAT_DIALOG_DATA);
  private ref = inject(MatDialogRef);
  private fb = inject(FormBuilder);

  allowedStatuses = STATUS_TRANSITIONS[this.data.status] ?? [{ value: this.data.status, label: this.data.status }];

  form = this.fb.group({
    status:     [this.data.status,     Validators.required],
    amountPaid: [this.data.amountPaid, [Validators.required, Validators.min(0)]],
    dueDate:    [this.data.dueDate ? new Date(this.data.dueDate) : null, Validators.required],
    sentTo:     [this.data.sentTo ?? '']
  });

  save() {
    if (this.form.invalid) return;
    const v = this.form.value;
    const d = v.dueDate as Date;
    this.ref.close({
      status:     v.status,
      amountPaid: v.amountPaid,
      dueDate:    `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,
      sentTo:     v.sentTo
    });
  }
}
