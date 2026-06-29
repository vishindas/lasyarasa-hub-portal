import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { environment } from '../../../../environments/environment';

function passwordsMatch(control: AbstractControl): ValidationErrors | null {
  const pw = control.get('newPassword')?.value;
  const confirm = control.get('confirmPassword')?.value;
  return pw && confirm && pw !== confirm ? { mismatch: true } : null;
}

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [ReactiveFormsModule, MatCardModule, MatButtonModule,
            MatFormFieldModule, MatInputModule, MatIconModule, MatSnackBarModule],
  template: `
    <div class="page-header">
      <div>
        <h2>Change Password</h2>
        <p class="page-subtitle">Update your login password</p>
      </div>
    </div>

    <mat-card style="max-width:480px">
      <mat-card-content style="padding:24px">
        <form [formGroup]="form" (ngSubmit)="submit()">

          <mat-form-field appearance="outline" style="width:100%">
            <mat-label>Current Password</mat-label>
            <input matInput [type]="showCurrent() ? 'text' : 'password'" formControlName="currentPassword"
                   (input)="wrongPassword.set(false)">
            <button mat-icon-button matSuffix type="button" (click)="showCurrent.set(!showCurrent())">
              <mat-icon>{{ showCurrent() ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
            @if (form.get('currentPassword')?.hasError('required') && form.get('currentPassword')?.touched) {
              <mat-error>Current password is required</mat-error>
            }
          </mat-form-field>

          @if (wrongPassword()) {
            <div style="color:#dc2626;font-size:0.8rem;margin:-4px 0 8px 14px;display:flex;align-items:center;gap:4px">
              <mat-icon style="font-size:14px;width:14px;height:14px">error</mat-icon>
              Current password is incorrect
            </div>
          }

          <mat-form-field appearance="outline" style="width:100%;margin-top:8px">
            <mat-label>New Password</mat-label>
            <input matInput [type]="showNew() ? 'text' : 'password'" formControlName="newPassword">
            <button mat-icon-button matSuffix type="button" (click)="showNew.set(!showNew())">
              <mat-icon>{{ showNew() ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
            @if (form.get('newPassword')?.hasError('required') && form.get('newPassword')?.touched) {
              <mat-error>New password is required</mat-error>
            }
            @if (form.get('newPassword')?.hasError('minlength') && form.get('newPassword')?.touched) {
              <mat-error>Minimum 8 characters</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline" style="width:100%;margin-top:8px">
            <mat-label>Confirm New Password</mat-label>
            <input matInput [type]="showConfirm() ? 'text' : 'password'" formControlName="confirmPassword">
            <button mat-icon-button matSuffix type="button" (click)="showConfirm.set(!showConfirm())">
              <mat-icon>{{ showConfirm() ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
          </mat-form-field>

          @if (form.hasError('mismatch') && form.get('confirmPassword')?.touched) {
            <div style="color:#dc2626;font-size:0.8rem;margin:-4px 0 8px 14px;display:flex;align-items:center;gap:4px">
              <mat-icon style="font-size:14px;width:14px;height:14px">error</mat-icon>
              Passwords do not match
            </div>
          }

          <div style="margin-top:24px">
            <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || saving()">
              <mat-icon>lock_reset</mat-icon>
              {{ saving() ? 'Saving...' : 'Update Password' }}
            </button>
          </div>

        </form>
      </mat-card-content>
    </mat-card>
  `
})
export class ChangePasswordComponent {
  private http = inject(HttpClient);
  private snack = inject(MatSnackBar);
  private fb = inject(FormBuilder);

  showCurrent = signal(false);
  showNew = signal(false);
  showConfirm = signal(false);
  saving = signal(false);
  wrongPassword = signal(false);

  form = this.fb.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required]
  }, { validators: passwordsMatch });

  submit() {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.wrongPassword.set(false);
    const { currentPassword, newPassword } = this.form.value;
    this.http.post(`${environment.apiUrl}/auth/change-password`, { currentPassword, newPassword })
      .subscribe({
        next: () => {
          this.snack.open('Password updated successfully', 'OK', { duration: 3000 });
          this.form.reset();
          this.saving.set(false);
        },
        error: (err) => {
          this.saving.set(false);
          if (err.status === 401) {
            this.wrongPassword.set(true);
            this.form.get('currentPassword')?.setErrors({ wrong: true });
          } else {
            this.snack.open(err.error?.error || 'Failed to update password', 'OK', { duration: 4000 });
          }
        }
      });
  }
}
