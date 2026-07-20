import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CurrencyPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { CurrencyService } from '../../../core/services/currency.service';
import { environment } from '../../../../environments/environment';
import { Fee } from '../../../core/models/fee.model';

export interface MarkPaidDialogData {
  fee: Fee;
}

@Component({
  selector: 'app-mark-paid-dialog',
  standalone: true,
  imports: [CurrencyPipe, ReactiveFormsModule, MatDialogModule, MatFormFieldModule,
            MatInputModule, MatButtonModule, MatDatepickerModule, MatNativeDateModule],
  template: `
    <h2 mat-dialog-title>Mark as Paid</h2>
    <mat-dialog-content>
      <div style="margin-bottom:16px">
        <div style="font-size:0.75rem;color:#6c757d;font-weight:600;text-transform:uppercase;letter-spacing:0.05em">Student</div>
        <div style="font-size:1rem;font-weight:600;margin-top:2px">{{ data.fee.studentName }}</div>
      </div>
      <div style="margin-bottom:24px;padding:16px;background:#f0f4ff;border-radius:8px;text-align:center">
        <div style="font-size:0.72rem;color:#6c757d;font-weight:700;text-transform:uppercase;letter-spacing:0.07em">Amount Due</div>
        <div style="font-size:2rem;font-weight:800;color:#3d4ed8;margin-top:4px">
          {{ data.fee.amount | currency:cs.currency():'symbol':'1.0-0' }}
        </div>
      </div>
      <form [formGroup]="form" style="display:flex;flex-direction:column;gap:12px">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Paid Date</mat-label>
          <input matInput [matDatepicker]="picker" formControlName="paidAt" />
          <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
          <mat-datepicker #picker></mat-datepicker>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Paid By (optional)</mat-label>
          <input matInput formControlName="paidBy" placeholder="Name of person who paid" />
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button color="primary" (click)="confirm()" [disabled]="saving()">
        {{ saving() ? 'Saving…' : 'Confirm Payment' }}
      </button>
    </mat-dialog-actions>
  `
})
export class MarkPaidDialog {
  private http = inject(HttpClient);
  private ref = inject(MatDialogRef<MarkPaidDialog>);
  data = inject<MarkPaidDialogData>(MAT_DIALOG_DATA);
  cs = inject(CurrencyService);
  saving = signal(false);

  form = inject(FormBuilder).group({
    paidAt: [new Date()],
    paidBy: ['']
  });

  private toDateStr(d: Date | null): string {
    if (!d) return new Date().toISOString().slice(0, 10);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  confirm() {
    this.saving.set(true);
    const v = this.form.value;
    const fee = this.data.fee;
    const payload = {
      ...fee,
      status: 'PAID',
      paidAt: this.toDateStr(v.paidAt as any),
      paidBy: v.paidBy || null
    };
    this.http.put(`${environment.apiUrl}/school/fees/${fee.id}`, payload)
      .subscribe({
        next: () => this.ref.close(true),
        error: () => this.saving.set(false)
      });
  }
}
