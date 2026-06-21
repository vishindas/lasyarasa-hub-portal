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
  selector: 'app-confirm-all-dialog',
  standalone: true,
  imports: [DecimalPipe, ReactiveFormsModule, MatDialogModule, MatButtonModule,
            MatFormFieldModule, MatInputModule, MatDatepickerModule,
            MatNativeDateModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>Generate All Invoices</h2>

    <mat-dialog-content>
      <div class="gen-all-summary">
        <div class="gen-all-stat">
          <span class="gen-all-num">{{ data.previews.length }}</span>
          <span class="gen-all-label">invoice{{ data.previews.length !== 1 ? 's' : '' }}</span>
        </div>
        <div class="gen-all-divider"></div>
        <div class="gen-all-stat">
          <span class="gen-all-num">₹{{ data.grandTotal | number:'1.0-0' }}</span>
          <span class="gen-all-label">total amount</span>
        </div>
        <div class="gen-all-divider"></div>
        <div class="gen-all-stat">
          <span class="gen-all-num">{{ data.studentCount }}</span>
          <span class="gen-all-label">student{{ data.studentCount !== 1 ? 's' : '' }}</span>
        </div>
      </div>

      <p class="gen-all-note">
        <mat-icon style="font-size:16px;width:16px;height:16px;vertical-align:middle;color:#3d4ed8">info</mat-icon>
        Each family will receive one invoice. Students sharing the same guardian email are grouped together.
      </p>

      <mat-form-field appearance="outline" style="width:100%;margin-top:8px">
        <mat-label>Payment Due Date (applies to all)</mat-label>
        <input matInput [matDatepicker]="picker" [formControl]="dueDateCtrl">
        <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
        <mat-datepicker #picker></mat-datepicker>
      </mat-form-field>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button color="primary" [disabled]="!dueDateCtrl.valid" (click)="confirm()">
        <mat-icon>receipt_long</mat-icon>
        Generate {{ data.previews.length }} Invoice{{ data.previews.length !== 1 ? 's' : '' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .gen-all-summary {
      display: flex; align-items: center; justify-content: space-around;
      background: #f4f5fb; border-radius: 10px; padding: 20px 16px; margin-bottom: 16px;
    }
    .gen-all-stat { display: flex; flex-direction: column; align-items: center; gap: 4px; }
    .gen-all-num { font-size: 1.6rem; font-weight: 800; color: #3d4ed8; line-height: 1; }
    .gen-all-label { font-size: 0.75rem; color: #6c757d; text-transform: uppercase; letter-spacing: 0.05em; }
    .gen-all-divider { width: 1px; height: 40px; background: #e8eaf0; }
    .gen-all-note {
      display: flex; align-items: flex-start; gap: 6px;
      font-size: 0.82rem; color: #4b5563; margin: 0 0 8px; line-height: 1.5;
    }
  `]
})
export class ConfirmAllDialog {
  data: { previews: InvoicePreview[]; grandTotal: number; studentCount: number } = inject(MAT_DIALOG_DATA);
  private ref = inject(MatDialogRef);

  dueDateCtrl = new FormControl(
    new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    Validators.required
  );

  confirm() {
    if (!this.dueDateCtrl.valid) return;
    const d = this.dueDateCtrl.value as Date;
    const dueDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    this.ref.close({ dueDate });
  }
}
