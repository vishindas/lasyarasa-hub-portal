import { Component, inject, signal, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DatePipe } from '@angular/common';
import { environment } from '../../../../environments/environment';

interface Provider {
  id: number;
  name: string;
  email: string;
  serviceType: string;
  status: string;
  createdAt: string;
}

const SERVICE_TYPE_LABELS: Record<string, string> = {
  VIDYA_RASA: 'Vidya Rasa (Dance)',
  VASTRA_RASA: 'Vastra Rasa (Costumes)',
  ROOPA_RASA: 'Roopa Rasa (Makeup)',
  CHITRA_RASA: 'Chitra Rasa (Videography)'
};

@Component({
  selector: 'app-admin-providers',
  standalone: true,
  imports: [ReactiveFormsModule, MatCardModule, MatButtonModule, MatIconModule,
            MatFormFieldModule, MatInputModule, MatSelectModule, MatTableModule,
            MatChipsModule, MatSnackBarModule, DatePipe],
  template: `
    <div class="page-header">
      <div>
        <h2>Providers</h2>
        <p class="page-subtitle">Manage school and provider accounts</p>
      </div>
      <button mat-flat-button color="primary" (click)="showForm.set(!showForm())">
        <mat-icon>{{ showForm() ? 'close' : 'add' }}</mat-icon>
        {{ showForm() ? 'Cancel' : 'Add Provider' }}
      </button>
    </div>

    @if (showForm()) {
      <mat-card style="margin-bottom:24px;max-width:560px">
        <mat-card-content style="padding:24px">
          <h3 style="margin:0 0 20px;font-size:1rem;font-weight:600">New Provider Account</h3>
          <form [formGroup]="form" (ngSubmit)="submit()">

            <mat-form-field appearance="outline" style="width:100%">
              <mat-label>School / Provider Name</mat-label>
              <input matInput formControlName="name" placeholder="e.g. Natya Dance Academy">
              @if (form.get('name')?.hasError('required') && form.get('name')?.touched) {
                <mat-error>Name is required</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" style="width:100%;margin-top:8px">
              <mat-label>Admin Email</mat-label>
              <input matInput formControlName="email" type="email" placeholder="admin@school.com">
              @if (form.get('email')?.hasError('required') && form.get('email')?.touched) {
                <mat-error>Email is required</mat-error>
              }
              @if (form.get('email')?.hasError('email') && form.get('email')?.touched) {
                <mat-error>Enter a valid email</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" style="width:100%;margin-top:8px">
              <mat-label>Password</mat-label>
              <input matInput [type]="showPassword() ? 'text' : 'password'" formControlName="password">
              <button mat-icon-button matSuffix type="button" (click)="showPassword.set(!showPassword())">
                <mat-icon>{{ showPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              @if (form.get('password')?.hasError('required') && form.get('password')?.touched) {
                <mat-error>Password is required</mat-error>
              }
              @if (form.get('password')?.hasError('minlength') && form.get('password')?.touched) {
                <mat-error>Minimum 8 characters</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" style="width:100%;margin-top:8px">
              <mat-label>Service Type</mat-label>
              <mat-select formControlName="serviceType">
                <mat-option value="VIDYA_RASA">Vidya Rasa — Dance School</mat-option>
                <mat-option value="VASTRA_RASA">Vastra Rasa — Costumes &amp; Styling</mat-option>
                <mat-option value="ROOPA_RASA">Roopa Rasa — Makeup &amp; Aesthetics</mat-option>
                <mat-option value="CHITRA_RASA">Chitra Rasa — Videography</mat-option>
              </mat-select>
            </mat-form-field>

            @if (serverError()) {
              <div style="color:#dc2626;font-size:0.8rem;margin:4px 0 0 14px;display:flex;align-items:center;gap:4px">
                <mat-icon style="font-size:14px;width:14px;height:14px">error</mat-icon>
                {{ serverError() }}
              </div>
            }

            <div style="margin-top:20px;display:flex;gap:12px">
              <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || saving()">
                <mat-icon>person_add</mat-icon>
                {{ saving() ? 'Creating...' : 'Create Provider' }}
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>
    }

    <mat-card>
      <mat-card-content style="padding:0">
        @if (loading()) {
          <div style="padding:48px;text-align:center;color:#9ca3af">
            <mat-icon style="font-size:32px;width:32px;height:32px">hourglass_empty</mat-icon>
            <p>Loading providers...</p>
          </div>
        } @else if (providers().length === 0) {
          <div style="padding:48px;text-align:center;color:#9ca3af">
            <mat-icon style="font-size:48px;width:48px;height:48px">business_center</mat-icon>
            <p style="margin-top:12px">No providers yet. Add one above.</p>
          </div>
        } @else {
          <table mat-table [dataSource]="providers()" style="width:100%">
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Name</th>
              <td mat-cell *matCellDef="let p" style="font-weight:500">{{ p.name }}</td>
            </ng-container>

            <ng-container matColumnDef="email">
              <th mat-header-cell *matHeaderCellDef>Admin Email</th>
              <td mat-cell *matCellDef="let p" style="color:#6b7280">{{ p.email }}</td>
            </ng-container>

            <ng-container matColumnDef="serviceType">
              <th mat-header-cell *matHeaderCellDef>Type</th>
              <td mat-cell *matCellDef="let p">
                <span style="font-size:0.78rem;background:#eef2ff;color:#4338ca;padding:2px 8px;border-radius:12px;white-space:nowrap">
                  {{ serviceLabel(p.serviceType) }}
                </span>
              </td>
            </ng-container>

            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let p">
                <span [style]="p.status === 'active'
                  ? 'font-size:0.78rem;background:#f0fdf4;color:#15803d;padding:2px 8px;border-radius:12px'
                  : 'font-size:0.78rem;background:#fef2f2;color:#dc2626;padding:2px 8px;border-radius:12px'">
                  {{ p.status }}
                </span>
              </td>
            </ng-container>

            <ng-container matColumnDef="createdAt">
              <th mat-header-cell *matHeaderCellDef>Created</th>
              <td mat-cell *matCellDef="let p" style="color:#6b7280;font-size:0.85rem">
                {{ p.createdAt | date:'dd MMM yyyy' }}
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let row; columns: columns;"></tr>
          </table>
        }
      </mat-card-content>
    </mat-card>
  `
})
export class AdminProvidersComponent implements OnInit {
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);
  private snack = inject(MatSnackBar);

  providers = signal<Provider[]>([]);
  loading = signal(true);
  showForm = signal(false);
  saving = signal(false);
  showPassword = signal(false);
  serverError = signal('');

  columns = ['name', 'email', 'serviceType', 'status', 'createdAt'];

  form = this.fb.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    serviceType: ['VIDYA_RASA', Validators.required]
  });

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.http.get<Provider[]>(`${environment.apiUrl}/admin/providers`)
      .subscribe({
        next: data => { this.providers.set(data); this.loading.set(false); },
        error: () => { this.loading.set(false); }
      });
  }

  submit() {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.serverError.set('');
    this.http.post<Provider>(`${environment.apiUrl}/admin/providers`, this.form.value)
      .subscribe({
        next: created => {
          this.providers.update(list => [created, ...list]);
          this.form.reset({ serviceType: 'VIDYA_RASA' });
          this.showForm.set(false);
          this.saving.set(false);
          this.snack.open(`Provider "${created.name}" created successfully`, 'OK', { duration: 3000 });
        },
        error: err => {
          this.serverError.set(err.error?.error || 'Failed to create provider');
          this.saving.set(false);
        }
      });
  }

  serviceLabel(type: string): string {
    return SERVICE_TYPE_LABELS[type] ?? type;
  }
}
