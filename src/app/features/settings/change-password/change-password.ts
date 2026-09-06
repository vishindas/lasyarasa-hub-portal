import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogRef } from '@angular/material/dialog';
import { AuthService } from '../../../core/auth/auth.service';

const MAX_PASSWORD_UTF8_BYTES = 72;

function passwordsMatch(control: AbstractControl): ValidationErrors | null {
  const pw = control.get('newPassword')?.value;
  const confirm = control.get('confirmPassword')?.value;
  return pw && confirm && pw !== confirm ? { mismatch: true } : null;
}

function maxUtf8Bytes(maxBytes: number) {
  return (control: AbstractControl): ValidationErrors | null => {
    const value: string = control.value ?? '';
    const byteLength = new TextEncoder().encode(value).length;
    return byteLength > maxBytes ? { maxUtf8Bytes: { maxBytes, actual: byteLength } } : null;
  };
}

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [ReactiveFormsModule, MatCardModule, MatButtonModule,
            MatFormFieldModule, MatInputModule, MatIconModule, MatSnackBarModule],
  // UX-6: neutral restyle, safe in both render contexts this component is
  // genuinely shared across -- the Provider/Admin routed /settings/
  // change-password page (no MatDialogRef, no .sp-scope ancestor) and the
  // Student account-menu dialog (MatDialogRef present). --sp-* custom
  // properties only resolve where a .sp-scope ancestor exists in the DOM;
  // a MatDialog's content renders inside Angular CDK's own overlay
  // container, appended directly to <body> as a sibling of the app root,
  // so it is NOT a descendant of .sp-scope either -- neither context
  // actually resolves the live token today, both render the fallback
  // value. Tokens are used anyway for consistency with the rest of the
  // codebase and so this component picks up the real value for free if it
  // is ever rendered inside .sp-scope in the future. No context-specific
  // branching needed: every value below is deliberately safe for both.
  styles: [`
    :host { display: block; }
    .page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
    h2 { font-size: 1.25rem; font-weight: 600; color: var(--sp-text, #1a1f36); margin: 0 0 4px; }
    .page-subtitle { font-size: 0.85rem; color: var(--sp-text-muted, #52596b); margin: 0; }
    /* Pre-existing 480px cap, unchanged and still applied identically in
       both contexts -- not a new dialog-specific geometry. The dialog's
       own panel width/maxWidth is set by account-menu.ts's dialog.open()
       call (untouched, out of scope here). */
    .card { max-width: 480px; border: 1px solid var(--sp-border-subtle, #edf0f7); box-shadow: none; }
    .card-content { padding: 24px; }
    mat-form-field { width: 100%; }
    .field-spaced { margin-top: 8px; }
    .field-error { color: var(--sp-tone-negative-text, #991b1b); font-size: 0.8rem; margin: -4px 0 8px 14px; display: flex; align-items: center; gap: 4px; }
    .field-error mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .actions { margin-top: 24px; }
    button[mat-flat-button] mat-icon { margin-right: 4px; }
  `],
  template: `
    <div class="page-header">
      <div>
        <h2>Change Password</h2>
        <p class="page-subtitle">Update your login password</p>
      </div>
      @if (dialogRef) {
        <button mat-icon-button type="button" aria-label="Close" (click)="dialogRef.close()">
          <mat-icon>close</mat-icon>
        </button>
      }
    </div>

    <mat-card class="card">
      <mat-card-content class="card-content">
        <form [formGroup]="form" (ngSubmit)="submit()">

          <mat-form-field appearance="outline">
            <mat-label>Current Password</mat-label>
            <input matInput [type]="showCurrent() ? 'text' : 'password'" formControlName="currentPassword"
                   autocomplete="current-password"
                   (input)="wrongPassword.set(false)">
            <button mat-icon-button matSuffix type="button"
                    [attr.aria-label]="showCurrent() ? 'Hide current password' : 'Show current password'"
                    (click)="showCurrent.set(!showCurrent())">
              <mat-icon>{{ showCurrent() ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
            @if (form.get('currentPassword')?.hasError('required') && form.get('currentPassword')?.touched) {
              <mat-error>Current password is required</mat-error>
            }
          </mat-form-field>

          @if (wrongPassword()) {
            <div class="field-error">
              <mat-icon aria-hidden="true">error</mat-icon>
              Current password is incorrect
            </div>
          }

          <mat-form-field appearance="outline" class="field-spaced">
            <mat-label>New Password</mat-label>
            <input matInput [type]="showNew() ? 'text' : 'password'" formControlName="newPassword"
                   autocomplete="new-password">
            <button mat-icon-button matSuffix type="button"
                    [attr.aria-label]="showNew() ? 'Hide new password' : 'Show new password'"
                    (click)="showNew.set(!showNew())">
              <mat-icon>{{ showNew() ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
            @if (form.get('newPassword')?.hasError('required') && form.get('newPassword')?.touched) {
              <mat-error>New password is required</mat-error>
            }
            @if (form.get('newPassword')?.hasError('minlength') && form.get('newPassword')?.touched) {
              <mat-error>Minimum 12 characters</mat-error>
            }
            @if (form.get('newPassword')?.hasError('maxlength') && form.get('newPassword')?.touched) {
              <mat-error>Maximum 64 characters</mat-error>
            }
            @if (form.get('newPassword')?.hasError('maxUtf8Bytes') && form.get('newPassword')?.touched) {
              <mat-error>Password is too long</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline" class="field-spaced">
            <mat-label>Confirm New Password</mat-label>
            <input matInput [type]="showConfirm() ? 'text' : 'password'" formControlName="confirmPassword"
                   autocomplete="new-password">
            <button mat-icon-button matSuffix type="button"
                    [attr.aria-label]="showConfirm() ? 'Hide confirmed password' : 'Show confirmed password'"
                    (click)="showConfirm.set(!showConfirm())">
              <mat-icon>{{ showConfirm() ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
            @if (form.get('confirmPassword')?.hasError('required') && form.get('confirmPassword')?.touched) {
              <mat-error>Please confirm your new password</mat-error>
            }
          </mat-form-field>

          @if (form.hasError('mismatch') && form.get('confirmPassword')?.touched) {
            <div class="field-error">
              <mat-icon aria-hidden="true">error</mat-icon>
              Passwords do not match
            </div>
          }

          <div class="actions">
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
  private authService = inject(AuthService);
  private snack = inject(MatSnackBar);
  private fb = inject(FormBuilder);
  /** Present only when opened as a dialog (e.g. the CLIENT account menu) -- absent for the existing routed staff settings page, which renders this unchanged. */
  dialogRef = inject(MatDialogRef<ChangePasswordComponent>, { optional: true });

  showCurrent = signal(false);
  showNew = signal(false);
  showConfirm = signal(false);
  saving = signal(false);
  wrongPassword = signal(false);

  form = this.fb.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(12), Validators.maxLength(64), maxUtf8Bytes(MAX_PASSWORD_UTF8_BYTES)]],
    confirmPassword: ['', Validators.required]
  }, { validators: passwordsMatch });

  submit() {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.wrongPassword.set(false);
    const { currentPassword, newPassword, confirmPassword } = this.form.getRawValue();
    this.authService.changePassword({
      currentPassword: currentPassword!,
      newPassword: newPassword!,
      confirmPassword: confirmPassword!
    }).subscribe({
      next: () => {
        this.snack.open('Password updated successfully', 'OK', { duration: 3000 });
        this.form.reset();
        this.saving.set(false);
        this.dialogRef?.close();
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        if (err.status === 401) {
          this.wrongPassword.set(true);
        } else if (err.status === 400) {
          const message = typeof err.error?.error === 'string'
            ? err.error.error
            : 'Please check your input and try again.';
          this.snack.open(message, 'OK', { duration: 4000 });
        } else {
          this.snack.open('Something went wrong. Please try again.', 'OK', { duration: 4000 });
        }
      }
    });
  }
}
