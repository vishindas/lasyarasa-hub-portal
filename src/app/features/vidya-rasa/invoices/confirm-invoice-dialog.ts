import { Component, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { InvoicePreview } from '../../../core/models/invoice.model';

@Component({
  selector: 'app-confirm-invoice-dialog',
  standalone: true,
  imports: [DecimalPipe, ReactiveFormsModule, MatDialogModule, MatButtonModule,
            MatFormFieldModule, MatInputModule, MatDatepickerModule,
            MatNativeDateModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>Generate Invoice</h2>

    <mat-dialog-content>
      <p class="invoice-payer-line">
        <mat-icon style="vertical-align:middle;color:#3d4ed8;font-size:18px;margin-right:4px">person</mat-icon>
        <strong>{{ data.preview.payerName }}</strong>
        @if (data.preview.payerEmail) {
          <span style="color:#6c757d;margin-left:6px">{{ data.preview.payerEmail }}</span>
        }
      </p>

      @for (sg of data.preview.students; track sg.studentId) {
        <div class="invoice-student-block">
          <p class="invoice-student-name">{{ sg.studentName }}</p>
          @for (fee of sg.fees; track fee.feeId) {
            <div class="invoice-line-item">
              <span>{{ fee.description }}</span>
              <span class="invoice-line-amount">₹{{ fee.amount | number:'1.0-0' }}</span>
            </div>
          }
        </div>
      }

      <div class="invoice-grand-total">
        <span>Grand Total</span>
        <span>₹{{ data.preview.grandTotal | number:'1.0-0' }}</span>
      </div>

      <mat-form-field appearance="outline" style="width:100%;margin-top:16px">
        <mat-label>Payment Due Date</mat-label>
        <input matInput [matDatepicker]="picker" [formControl]="dueDateCtrl">
        <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
        <mat-datepicker #picker></mat-datepicker>
      </mat-form-field>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button color="primary" [disabled]="!dueDateCtrl.valid" (click)="confirm()">
        <mat-icon>receipt_long</mat-icon> Generate
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .invoice-payer-line { display:flex; align-items:center; margin:0 0 16px; font-size:0.95rem; }
    .invoice-student-block { margin-bottom:12px; border-left:3px solid #e8eaf0; padding-left:12px; }
    .invoice-student-name { font-size:0.8rem; font-weight:700; color:#6c757d; text-transform:uppercase;
                             letter-spacing:0.05em; margin:0 0 6px; }
    .invoice-line-item { display:flex; justify-content:space-between; font-size:0.88rem;
                          padding:3px 0; color:#1a1f36; }
    .invoice-line-amount { font-weight:600; }
    .invoice-grand-total { display:flex; justify-content:space-between; font-weight:700;
                            font-size:1rem; border-top:2px solid #e8eaf0; padding-top:10px; margin-top:4px; }
  `]
})
export class ConfirmInvoiceDialog {
  data: { preview: InvoicePreview; feeIds: number[] } = inject(MAT_DIALOG_DATA);
  private ref = inject(MatDialogRef);

  dueDateCtrl = new FormControl(
    new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // default: 15 days from now
    Validators.required
  );

  confirm() {
    if (!this.dueDateCtrl.valid) return;
    const d = this.dueDateCtrl.value as Date;
    const dueDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    this.ref.close({ dueDate });
  }
}
