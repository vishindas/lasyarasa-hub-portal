import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Invoice } from '../../../core/models/invoice.model';

@Component({
  selector: 'app-void-invoice-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule,
            MatFormFieldModule, MatInputModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>Void Invoice</h2>

    <mat-dialog-content>

      <!-- warning banner — stronger for PAID/PARTIAL -->
      <div class="void-warning" [class.void-warning-critical]="isCritical">
        <mat-icon>{{ isCritical ? 'warning' : 'info' }}</mat-icon>
        <div>
          @if (isCritical) {
            <strong>This invoice has received payment.</strong>
            <p>Voiding a {{ data.status }} invoice will release the fees back to "Ready to Invoice".
               The payment record will be lost. This action cannot be undone.</p>
          } @else {
            <strong>This will void invoice {{ data.invoiceNumber }}.</strong>
            <p>The linked fees will be released back to "Ready to Invoice" so a
               corrected invoice can be generated.</p>
          }
        </div>
      </div>

      <!-- invoice summary -->
      <div class="void-summary">
        <span class="void-summary-label">Invoice</span>
        <span class="void-summary-value mono">{{ data.invoiceNumber }}</span>
        <span class="void-summary-label">Payer</span>
        <span class="void-summary-value">{{ data.payerName }}</span>
        <span class="void-summary-label">Total</span>
        <span class="void-summary-value">₹{{ data.totalAmount }}</span>
        <span class="void-summary-label">Status</span>
        <span class="void-summary-value">
          <span class="status-chip status-{{ data.status.toLowerCase() }}">{{ data.status }}</span>
        </span>
      </div>

      <form [formGroup]="form">
        <mat-form-field appearance="outline" style="width:100%;margin-top:8px">
          <mat-label>Reason for voiding *</mat-label>
          <textarea matInput formControlName="reason" rows="3"
                    placeholder="e.g. Incorrect amount, duplicate invoice, fee correction…"></textarea>
          <mat-hint align="end">{{ form.value.reason?.length || 0 }} / 500</mat-hint>
        </mat-form-field>
      </form>

    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button color="warn" [disabled]="form.invalid" (click)="confirm()">
        <mat-icon>block</mat-icon> Void Invoice
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .void-warning {
      display: flex; gap: 12px; align-items: flex-start;
      background: #fff8e1; border: 1px solid #f59e0b; border-radius: 8px;
      padding: 12px 14px; margin-bottom: 16px; color: #92400e;
      mat-icon { flex-shrink: 0; margin-top: 2px; }
      p { margin: 4px 0 0; font-size: 0.85rem; }
      strong { font-size: 0.88rem; }
    }
    .void-warning-critical {
      background: #fef2f2; border-color: #ef4444; color: #7f1d1d;
    }
    .void-summary {
      display: grid; grid-template-columns: auto 1fr; gap: 6px 16px;
      background: #f4f5fb; border-radius: 8px; padding: 10px 14px;
      margin-bottom: 12px; font-size: 0.85rem;
    }
    .void-summary-label { color: #6c757d; }
    .void-summary-value { font-weight: 500; color: #1a1f36; }
    .mono { font-family: monospace; }
  `]
})
export class VoidInvoiceDialog {
  data: Invoice = inject(MAT_DIALOG_DATA);
  private ref = inject(MatDialogRef);
  private fb = inject(FormBuilder);

  isCritical = this.data.status === 'PAID' || this.data.status === 'PARTIAL';

  form = this.fb.group({
    reason: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(500)]]
  });

  confirm() {
    if (this.form.invalid) return;
    this.ref.close({ reason: this.form.value.reason });
  }
}
