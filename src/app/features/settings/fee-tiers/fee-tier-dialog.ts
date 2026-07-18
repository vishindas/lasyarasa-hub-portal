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
    .rate-row { display: flex; gap: 8px; align-items: center; margin-bottom: 2px; }
    .rate-row mat-form-field { flex: 1; }
    .age-hint { font-size: 0.75rem; color: #6c757d; margin: -8px 0 8px; }
    .coverage-label { font-size: 0.75rem; color: #2e7d32; margin: -4px 0 10px 2px; display:flex; align-items:center; gap:4px; }
    .coverage-label mat-icon { font-size:14px; width:14px; height:14px; }
    .band-warning { font-size: 0.78rem; color: #b45309; background:#fffbeb; border:1px solid #fcd34d;
                    border-radius:6px; padding:6px 10px; margin-bottom:8px; display:flex; align-items:center; gap:6px; }
    .band-warning mat-icon { font-size:16px; width:16px; height:16px; flex-shrink:0; }
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
        <p class="age-hint">Max Age is exclusive — "Min 4, Max 6" covers ages 4 and 5 only (not 6). Connect bands end-to-end so there are no gaps. Leave Min/Max blank for a flat rate.</p>

        <div formArrayName="rates">
          @for (rateCtrl of rates.controls; track $index; let i = $index) {
            @if (bandCoverage(i); as label) {
              <div class="coverage-label">
                <mat-icon>check_circle</mat-icon>{{ label }}
              </div>
            }
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

        @for (warn of bandGaps; track warn) {
          <div class="band-warning">
            <mat-icon>warning</mat-icon>{{ warn }}
          </div>
        }

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

  bandCoverage(i: number): string {
    const r = this.rates.at(i).value;
    const min = r.minAge, max = r.maxAge;
    if (min == null || min === '' || max == null || max === '') return '';
    const minN = Number(min), maxN = Number(max);
    if (isNaN(minN) || isNaN(maxN) || maxN <= minN) return '';
    const top = maxN - 1;
    return minN === top ? `Covers age ${minN} only` : `Covers ages ${minN}–${top}`;
  }

  get bandGaps(): string[] {
    const bands = this.rates.controls
      .map(c => c.value)
      .filter(r => r.minAge != null && r.minAge !== '' && r.maxAge != null && r.maxAge !== '')
      .map(r => ({ min: Number(r.minAge), max: Number(r.maxAge) }))
      .filter(r => !isNaN(r.min) && !isNaN(r.max) && r.max > r.min)
      .sort((a, b) => a.min - b.min);

    if (bands.length < 2) return [];

    const warnings: string[] = [];
    for (let i = 0; i < bands.length - 1; i++) {
      const curr = bands[i], next = bands[i + 1];
      if (curr.max < next.min) {
        const gapEnd = next.min - 1;
        warnings.push(curr.max === gapEnd
          ? `Age ${curr.max} is not covered by any band`
          : `Ages ${curr.max}–${gapEnd} are not covered by any band`);
      } else if (curr.max > next.min) {
        warnings.push(`Bands overlap between ages ${next.min}–${curr.max - 1}`);
      }
    }
    return warnings;
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
