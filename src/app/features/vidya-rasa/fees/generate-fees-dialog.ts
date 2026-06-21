import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { environment } from '../../../../environments/environment';
import { Fee } from '../../../core/models/fee.model';

@Component({
  selector: 'app-generate-fees-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Generate Monthly Fees</h2>
    <mat-dialog-content>
      <p style="color:#6c757d;font-size:0.88rem;margin:0 0 16px">
        Creates one fee per active enrollment based on each student's fee tier.
        Skips students who already have a fee for the selected month.
      </p>
      <form [formGroup]="form" class="dialog-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Month (1–12)</mat-label>
          <input matInput type="number" min="1" max="12" formControlName="month" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Year</mat-label>
          <input matInput type="number" min="2020" max="2099" formControlName="year" />
        </mat-form-field>
      </form>
      @if (result() !== null) {
        <p style="color:#198754;font-size:0.88rem;margin:8px 0 0">
          ✓ Generated {{ result() }} fee record{{ result() === 1 ? '' : 's' }}.
        </p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button color="primary" (click)="generate()" [disabled]="form.invalid || saving()">
        {{ saving() ? 'Generating…' : 'Generate' }}
      </button>
    </mat-dialog-actions>
  `
})
export class GenerateFeesDialog {
  private http = inject(HttpClient);
  private ref = inject(MatDialogRef<GenerateFeesDialog>);

  private today = new Date();
  form = inject(FormBuilder).group({
    month: [this.today.getMonth() + 1, [Validators.required, Validators.min(1), Validators.max(12)]],
    year: [this.today.getFullYear(), [Validators.required, Validators.min(2020), Validators.max(2099)]]
  });

  saving = signal(false);
  result = signal<number | null>(null);

  generate() {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.http.post<Fee[]>(`${environment.apiUrl}/school/fees/generate`, this.form.value)
      .subscribe({
        next: (res) => {
          this.saving.set(false);
          this.result.set(res.length);
          setTimeout(() => this.ref.close(res.length > 0), 1500);
        },
        error: () => this.saving.set(false)
      });
  }
}
