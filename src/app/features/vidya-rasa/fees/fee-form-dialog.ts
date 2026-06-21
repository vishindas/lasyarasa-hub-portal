import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { environment } from '../../../../environments/environment';
import { Fee } from '../../../core/models/fee.model';
import { FeeTier } from '../../../core/models/settings.model';

export interface FeeDialogData {
  fee?: Fee;
  studentId?: number;
  feeTierId?: number;
  feeTiers?: FeeTier[];
}

@Component({
  selector: 'app-fee-form-dialog',
  standalone: true,
  imports: [DecimalPipe, ReactiveFormsModule, MatDialogModule, MatFormFieldModule,
            MatInputModule, MatSelectModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data?.fee ? 'Edit Fee' : 'Add Fee' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Student ID</mat-label>
          <input matInput type="number" formControlName="studentId" />
        </mat-form-field>

        @if (data?.feeTiers?.length) {
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Fee Tier</mat-label>
            <mat-select formControlName="feeTierId" (selectionChange)="onTierChange($event.value)">
              <mat-option [value]="null">— None —</mat-option>
              @for (t of data!.feeTiers!; track t.id) {
                <mat-option [value]="t.id">{{ t.label }} ({{ t.amount | number:'1.0-0' }})</mat-option>
              }
            </mat-select>
          </mat-form-field>
        }

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Amount</mat-label>
          <input matInput type="number" formControlName="amount" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Due Date</mat-label>
          <input matInput type="date" formControlName="dueDate" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Status</mat-label>
          <mat-select formControlName="status">
            <mat-option value="PENDING">Pending</mat-option>
            <mat-option value="PAID">Paid</mat-option>
            <mat-option value="OVERDUE">Overdue</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Paid On</mat-label>
          <input matInput type="date" formControlName="paidAt" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Paid By</mat-label>
          <input matInput formControlName="paidBy" placeholder="Name of person who paid" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Notes</mat-label>
          <textarea matInput formControlName="notes" rows="2"></textarea>
        </mat-form-field>

      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button color="primary" (click)="save()" [disabled]="form.invalid || saving()">
        {{ saving() ? 'Saving…' : 'Save' }}
      </button>
    </mat-dialog-actions>
  `
})
export class FeeFormDialog {
  private http = inject(HttpClient);
  private ref = inject(MatDialogRef<FeeFormDialog>);
  data = inject<FeeDialogData | null>(MAT_DIALOG_DATA);
  saving = signal(false);

  private fee = this.data?.fee;

  form = inject(FormBuilder).group({
    studentId: [this.fee?.studentId ?? this.data?.studentId ?? null, Validators.required],
    feeTierId: [this.fee?.feeTierId ?? this.data?.feeTierId ?? null],
    amount: [this.fee?.amount ?? null, Validators.required],
    dueDate: [this.fee?.dueDate ?? '', Validators.required],
    status: [this.fee?.status ?? 'PENDING', Validators.required],
    paidAt: [this.fee?.paidAt ?? ''],
    paidBy: [this.fee?.paidBy ?? ''],
    notes: [this.fee?.notes ?? '']
  });

  onTierChange(tierId: number | null) {
    if (!tierId) return;
    const tier = this.data?.feeTiers?.find(t => t.id === tierId);
    if (tier) this.form.get('amount')!.setValue(tier.amount as any);
  }

  save() {
    if (this.form.invalid) return;
    this.saving.set(true);
    const v = this.form.value;
    const payload = {
      ...v,
      paidAt: v.paidAt || null,
      paidBy: v.paidBy || null,
    };
    const req = this.fee
      ? this.http.put(`${environment.apiUrl}/school/fees/${this.fee.id}`, payload)
      : this.http.post(`${environment.apiUrl}/school/fees`, payload);
    req.subscribe({
      next: () => this.ref.close(true),
      error: () => this.saving.set(false)
    });
  }
}
