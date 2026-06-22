import { Component, inject, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDividerModule } from '@angular/material/divider';
import { environment } from '../../../../environments/environment';

interface EmailSettings {
  reminderDays: number[];
  enabled: boolean;
}

@Component({
  selector: 'app-invoice-reminders',
  standalone: true,
  imports: [FormsModule, MatCardModule, MatButtonModule, MatIconModule,
            MatSlideToggleModule, MatSnackBarModule, MatChipsModule,
            MatFormFieldModule, MatInputModule, MatDividerModule],
  styles: [`
    .section-label {
      font-size: 0.72rem; font-weight: 700; letter-spacing: 0.07em;
      text-transform: uppercase; color: #6c757d; margin: 0 0 12px;
    }
    .day-chips { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0; }
    .day-chip {
      display: inline-flex; align-items: center; gap: 4px;
      background: #eef0fb; color: #3d4ed8; border-radius: 20px;
      padding: 4px 12px; font-size: 0.85rem; font-weight: 600;
      border: 1.5px solid #c7d2fe;
    }
    .day-chip button {
      background: none; border: none; cursor: pointer; padding: 0;
      color: #6366f1; line-height: 1; font-size: 14px; margin-left: 2px;
    }
    .add-day-row { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
    .info-box {
      background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px;
      padding: 12px 16px; font-size: 0.85rem; color: #0c4a6e; margin-bottom: 20px;
      display: flex; gap: 10px; align-items: flex-start;
    }
  `],
  template: `
    @if (settings(); as s) {

      <div class="page-header">
        <div>
          <h2>Invoice Reminders</h2>
          <p class="page-subtitle">Automatically email overdue invoices on specific days of the month</p>
        </div>
      </div>

      <mat-card style="max-width:560px">
        <mat-card-content style="padding-top:20px">

          <div class="info-box">
            <mat-icon style="font-size:18px;width:18px;height:18px;flex-shrink:0;margin-top:1px">info</mat-icon>
            <div>
              On the configured days, the system will automatically email all
              <strong>SENT</strong>, <strong>OVERDUE</strong>, and <strong>PARTIAL</strong>
              invoices that have a payer email on file.
            </div>
          </div>

          <!-- Enable toggle -->
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px">
            <div>
              <div style="font-weight:600;font-size:0.95rem;color:#1a1f36">Enable auto-reminders</div>
              <div style="font-size:0.82rem;color:#6c757d;margin-top:2px">
                {{ s.enabled ? 'Reminders are active' : 'Reminders are paused' }}
              </div>
            </div>
            <mat-slide-toggle [checked]="s.enabled" (change)="toggle($event.checked)"></mat-slide-toggle>
          </div>

          <mat-divider style="margin-bottom:20px"></mat-divider>

          <!-- Reminder days -->
          <p class="section-label">Send reminders on day(s) of the month</p>

          <div class="day-chips">
            @for (day of s.reminderDays; track day) {
              <span class="day-chip">
                {{ day }}{{ ordinal(day) }}
                <button (click)="removeDay(day)" title="Remove">×</button>
              </span>
            }
            @if (s.reminderDays.length === 0) {
              <span style="font-size:0.83rem;color:#adb5bd">No reminder days configured</span>
            }
          </div>

          <div class="add-day-row">
            <mat-form-field appearance="outline" style="width:100px">
              <mat-label>Day (1–28)</mat-label>
              <input matInput type="number" min="1" max="28" [(ngModel)]="newDay" />
            </mat-form-field>
            <button mat-stroked-button color="primary" (click)="addDay()" [disabled]="!isValidDay()">
              <mat-icon>add</mat-icon> Add Day
            </button>
          </div>

          <div style="margin-top:24px;display:flex;justify-content:flex-end">
            <button mat-flat-button color="primary" (click)="save()">
              <mat-icon>save</mat-icon> Save Settings
            </button>
          </div>

        </mat-card-content>
      </mat-card>

    } @else {
      <p style="color:#adb5bd;padding:32px 0">Loading…</p>
    }
  `
})
export class InvoiceRemindersComponent implements OnInit {
  private http = inject(HttpClient);
  private snack = inject(MatSnackBar);

  settings = signal<EmailSettings | null>(null);
  newDay: number | null = null;

  ngOnInit() { this.load(); }

  load() {
    this.http.get<EmailSettings>(`${environment.apiUrl}/school/settings/invoice-email`)
      .subscribe(d => this.settings.set({ ...d, reminderDays: [...(d.reminderDays ?? [])] }));
  }

  toggle(enabled: boolean) {
    this.settings.update(s => s ? { ...s, enabled } : s);
  }

  isValidDay() {
    return this.newDay !== null && this.newDay >= 1 && this.newDay <= 28;
  }

  addDay() {
    if (!this.isValidDay()) return;
    this.settings.update(s => {
      if (!s || s.reminderDays.includes(this.newDay!)) return s;
      const days = [...s.reminderDays, this.newDay!].sort((a, b) => a - b);
      return { ...s, reminderDays: days };
    });
    this.newDay = null;
  }

  removeDay(day: number) {
    this.settings.update(s => s ? { ...s, reminderDays: s.reminderDays.filter(d => d !== day) } : s);
  }

  save() {
    const s = this.settings();
    if (!s) return;
    this.http.put<EmailSettings>(`${environment.apiUrl}/school/settings/invoice-email`, s)
      .subscribe({
        next: d => {
          this.settings.set(d);
          this.snack.open('Reminder settings saved', 'OK', { duration: 3000 });
        },
        error: () => this.snack.open('Failed to save settings', 'OK', { duration: 3000 })
      });
  }

  ordinal(n: number) {
    if (n >= 11 && n <= 13) return 'th';
    return ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
  }
}
