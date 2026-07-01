import { Component, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TitleCasePipe } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { environment } from '../../../../environments/environment';

export interface FeeOverrideDialogData {
  studentId: number;
  enrollments: { id: number; className: string; status: string }[];
}

@Component({
  selector: 'app-fee-override-dialog',
  standalone: true,
  imports: [TitleCasePipe, ReactiveFormsModule, MatDialogModule, MatFormFieldModule,
            MatInputModule, MatSelectModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Add Fee Override</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Enrollment (Class)</mat-label>
          <mat-select formControlName="enrollmentId">
            @for (e of data.enrollments; track e.id) {
              <mat-option [value]="e.id">{{ e.className }} ({{ e.status | titlecase }})</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Custom Amount</mat-label>
          <input matInput type="number" formControlName="amount" min="0" step="0.01" />
          <mat-hint>This amount replaces the standard tier price for the selected period</mat-hint>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Reason</mat-label>
          <input matInput formControlName="reason" placeholder="e.g. Joining offer, sibling rate" />
        </mat-form-field>
        <div style="display:flex;gap:12px">
          <mat-form-field appearance="outline" style="flex:1">
            <mat-label>Effective From</mat-label>
            <input matInput type="date" formControlName="effectiveFrom" />
          </mat-form-field>
          <mat-form-field appearance="outline" style="flex:1">
            <mat-label>Effective To (blank = ongoing)</mat-label>
            <input matInput type="date" formControlName="effectiveTo" />
          </mat-form-field>
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button color="primary" (click)="save()" [disabled]="form.invalid">Save</button>
    </mat-dialog-actions>
  `
})
export class FeeOverrideDialog {
  private http = inject(HttpClient);
  private ref = inject(MatDialogRef<FeeOverrideDialog>);
  data: FeeOverrideDialogData = inject(MAT_DIALOG_DATA);

  form = inject(FormBuilder).group({
    enrollmentId: [null, Validators.required],
    amount: [null, [Validators.required, Validators.min(0)]],
    reason: [''],
    effectiveFrom: [new Date().toISOString().slice(0, 10), Validators.required],
    effectiveTo: ['']
  });

  save() {
    if (this.form.invalid) return;
    const v = this.form.value;
    const body = {
      enrollmentId: v.enrollmentId,
      amount: v.amount,
      reason: v.reason || null,
      effectiveFrom: v.effectiveFrom,
      effectiveTo: v.effectiveTo || null
    };
    this.http.post(`${environment.apiUrl}/school/v2/students/${this.data.studentId}/fee-overrides`, body)
      .subscribe(() => this.ref.close(true));
  }
}
