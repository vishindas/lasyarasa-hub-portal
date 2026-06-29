import { Component, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule } from '@angular/material/button';
import { environment } from '../../../../environments/environment';
import { FeeTier } from '../../../core/models/settings.model';

@Component({
  selector: 'app-fee-tier-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSlideToggleModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data ? 'Edit Fee Tier' : 'Add Fee Tier' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Label</mat-label>
          <input matInput formControlName="label" placeholder="e.g. Monthly, Term Fee, Drop-in" />
          <mat-hint>A reusable price point — assign to a class, not a style</mat-hint>
        </mat-form-field>
        <div style="display:flex;gap:12px">
          <mat-form-field appearance="outline" style="flex:1">
            <mat-label>Amount ($)</mat-label>
            <input matInput type="number" formControlName="amount" min="0" step="0.01" />
          </mat-form-field>
          <mat-form-field appearance="outline" style="width:90px">
            <mat-label>Currency</mat-label>
            <input matInput formControlName="currency" maxlength="3" />
          </mat-form-field>
        </div>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Effective From</mat-label>
          <input matInput type="date" formControlName="effectiveFrom" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Effective To (leave blank = ongoing)</mat-label>
          <input matInput type="date" formControlName="effectiveTo" />
        </mat-form-field>
        @if (data) {
          <div style="margin-top:8px">
            <mat-slide-toggle formControlName="active">Active</mat-slide-toggle>
          </div>
        }
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button color="primary" (click)="save()" [disabled]="form.invalid">Save</button>
    </mat-dialog-actions>
  `
})
export class FeeTierDialog {
  private http = inject(HttpClient);
  private ref = inject(MatDialogRef<FeeTierDialog>);
  data: FeeTier | null = inject(MAT_DIALOG_DATA);

  form = inject(FormBuilder).group({
    label: [this.data?.label ?? '', Validators.required],
    amount: [this.data?.amount ?? null, [Validators.required, Validators.min(0)]],
    currency: [this.data?.currency ?? 'USD', Validators.required],
    effectiveFrom: [this.data?.effectiveFrom ?? new Date().toISOString().slice(0, 10)],
    effectiveTo: [this.data?.effectiveTo ?? ''],
    active: [this.data?.active ?? true]
  });

  save() {
    if (this.form.invalid) return;
    const body = { ...this.form.value, effectiveTo: this.form.value.effectiveTo || null };
    const req = this.data
      ? this.http.put(`${environment.apiUrl}/school/settings/fee-tiers/${this.data.id}`, body)
      : this.http.post(`${environment.apiUrl}/school/settings/fee-tiers`, body);
    req.subscribe(() => this.ref.close(true));
  }
}
