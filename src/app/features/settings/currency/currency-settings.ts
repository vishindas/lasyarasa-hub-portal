import { Component, inject, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { environment } from '../../../../environments/environment';

const CURRENCIES = [
  { code: 'INR', label: 'INR — Indian Rupee (₹)' },
  { code: 'USD', label: 'USD — US Dollar ($)' },
  { code: 'GBP', label: 'GBP — British Pound (£)' },
  { code: 'EUR', label: 'EUR — Euro (€)' },
  { code: 'AED', label: 'AED — UAE Dirham (د.إ)' },
  { code: 'SGD', label: 'SGD — Singapore Dollar (S$)' },
  { code: 'CAD', label: 'CAD — Canadian Dollar (C$)' },
  { code: 'AUD', label: 'AUD — Australian Dollar (A$)' },
  { code: 'MYR', label: 'MYR — Malaysian Ringgit (RM)' },
  { code: 'NZD', label: 'NZD — New Zealand Dollar (NZ$)' },
];

@Component({
  selector: 'app-currency-settings',
  standalone: true,
  imports: [FormsModule, MatCardModule, MatFormFieldModule, MatSelectModule,
            MatButtonModule, MatSnackBarModule],
  template: `
    <div class="page-header">
      <h2>Currency</h2>
      <p class="page-subtitle">Used on invoices and fee displays across your school</p>
    </div>

    <mat-card style="max-width:480px;padding:24px">
      <mat-form-field appearance="outline" style="width:100%">
        <mat-label>Currency</mat-label>
        <mat-select [(ngModel)]="selected">
          @for (c of currencies; track c.code) {
            <mat-option [value]="c.code">{{ c.label }}</mat-option>
          }
        </mat-select>
      </mat-form-field>

      <button mat-flat-button color="primary" (click)="save()" [disabled]="saving()">
        {{ saving() ? 'Saving…' : 'Save' }}
      </button>
    </mat-card>
  `
})
export class CurrencySettingsComponent implements OnInit {
  private http = inject(HttpClient);
  private snack = inject(MatSnackBar);

  currencies = CURRENCIES;
  selected = 'INR';
  saving = signal(false);

  ngOnInit() {
    this.http.get<{ currency: string }>(`${environment.apiUrl}/school/settings/currency`)
      .subscribe({ next: r => this.selected = r.currency });
  }

  save() {
    this.saving.set(true);
    this.http.put(`${environment.apiUrl}/school/settings/currency`, { currency: this.selected })
      .subscribe({
        next: () => {
          this.snack.open('Currency saved', 'OK', { duration: 2500 });
          this.saving.set(false);
        },
        error: () => {
          this.snack.open('Failed to save', 'OK', { duration: 3000 });
          this.saving.set(false);
        }
      });
  }
}
