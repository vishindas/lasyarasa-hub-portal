import { Component, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormArray, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { environment } from '../../../../environments/environment';
import { FeeTier } from '../../../core/models/settings.model';

@Component({
  selector: 'app-fee-tier-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule,
            MatSlideToggleModule, MatButtonModule, MatIconModule, MatDividerModule],
  styles: [`
    .rate-row { display: flex; gap: 8px; align-items: center; margin-bottom: 4px; }
    .rate-row mat-form-field { flex: 1; }
    .age-hint { font-size: 0.75rem; color: #6c757d; margin: -8px 0 8px; }
  `],
  template: `
    <h2 mat-dialog-title>{{ data ? 'Edit Fee Tier' : 'Add Fee Tier' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Label</mat-label>
          <input matInput formControlName="label" placeholder="e.g. Young Kids, Teen, Adult" />
          <mat-hint>A reusable pricing plan — assigned to a class</mat-hint>
        </mat-form-field>
        <div style="display:flex;gap:12px">
          <mat-form-field appearance="outline" style="width:90px">
            <mat-label>Currency</mat-label>
            <input matInput formControlName="currency" maxlength="3" />
          </mat-form-field>
          <mat-form-field appearance="outline" style="flex:1">
            <mat-label>Effective From</mat-label>
            <input matInput type="date" formControlName="effectiveFrom" />
          </mat-form-field>
          <mat-form-field appearance="outline" style="flex:1">
            <mat-label>Effective To (blank = ongoing)</mat-label>
            <input matInput type="date" formControlName="effectiveTo" />
          </mat-form-field>
        </div>

        <mat-divider style="margin: 12px 0 16px"></mat-divider>
        <p style="font-size:0.85rem;font-weight:600;margin:0 0 4px">Pricing Rates</p>
        <p class="age-hint">Leave Min/Max Age blank for a flat rate that applies to all ages. Use age ranges for banded pricing (e.g. 4–5 = $40, 5–6 = $60).</p>

        <div formArrayName="rates">
          @for (rateCtrl of rates.controls; track $index; let i = $index) {
            <div class="rate-row" [formGroupName]="i">
              <mat-form-field appearance="outline" style="width:90px">
                <mat-label>Min Age</mat-label>
                <input matInput type="number" formControlName="minAge" min="0" placeholder="—" />
              </mat-form-field>
              <mat-form-field appearance="outline" style="width:90px">
                <mat-label>Max Age</mat-label>
                <input matInput type="number" formControlName="maxAge" min="0" placeholder="—" />
              </mat-form-field>
              <mat-form-field appearance="outline" style="flex:1">
                <mat-label>Amount</mat-label>
                <input matInput type="number" formControlName="amount" min="0" step="0.01" />
              </mat-form-field>
              <button mat-icon-button color="warn" type="button" (click)="removeRate(i)"
                      [disabled]="rates.length === 1" title="Remove rate">
                <mat-icon>remove_circle_outline</mat-icon>
              </button>
            </div>
          }
        </div>

        <button mat-stroked-button type="button" (click)="addRate()" style="margin-bottom:12px">
          <mat-icon>add</mat-icon> Add Rate Row
        </button>

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
  private fb = inject(FormBuilder);
  data: FeeTier | null = inject(MAT_DIALOG_DATA);

  form = this.fb.group({
    label: [this.data?.label ?? '', Validators.required],
    currency: [this.data?.currency ?? 'USD', Validators.required],
    effectiveFrom: [this.data?.effectiveFrom ?? new Date().toISOString().slice(0, 10)],
    effectiveTo: [this.data?.effectiveTo ?? ''],
    active: [this.data?.active ?? true],
    rates: this.fb.array(this.initialRates())
  });

  get rates(): FormArray { return this.form.get('rates') as FormArray; }

  private initialRates(): FormGroup[] {
    const existing = this.data?.rates;
    if (existing && existing.length > 0) {
      return existing.map(r => this.fb.group({
        minAge: [r.minAge ?? null],
        maxAge: [r.maxAge ?? null],
        amount: [r.amount, [Validators.required, Validators.min(0)]]
      }));
    }
    // Legacy tier with only a flat amount — show as one flat rate row
    return [this.fb.group({
      minAge: [null],
      maxAge: [null],
      amount: [this.data?.amount ?? null, [Validators.required, Validators.min(0)]]
    })];
  }

  addRate() {
    this.rates.push(this.fb.group({
      minAge: [null],
      maxAge: [null],
      amount: [null, [Validators.required, Validators.min(0)]]
    }));
  }

  removeRate(i: number) {
    this.rates.removeAt(i);
  }

  save() {
    if (this.form.invalid) return;
    const v = this.form.value;
    const body = {
      label: v.label,
      currency: v.currency,
      effectiveFrom: v.effectiveFrom,
      effectiveTo: v.effectiveTo || null,
      active: v.active,
      rates: (v.rates ?? []).map((r: any) => ({
        minAge: r.minAge != null && r.minAge !== '' ? Number(r.minAge) : null,
        maxAge: r.maxAge != null && r.maxAge !== '' ? Number(r.maxAge) : null,
        amount: r.amount
      }))
    };
    const req = this.data
      ? this.http.put(`${environment.apiUrl}/school/settings/fee-tiers/${this.data.id}`, body)
      : this.http.post(`${environment.apiUrl}/school/settings/fee-tiers`, body);
    req.subscribe(() => this.ref.close(true));
  }
}
