import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Location } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/auth/auth.service';
import { environment } from '../../../environments/environment';

interface AcceptInvitationRequest {
  token: string;
  newPassword: string | null;
  confirmPassword: string | null;
}

interface AcceptInvitationResponse {
  purpose: string;
  providerId: number | null;
  studentId: number | null;
  guardianId: number | null;
  existingUserReused: boolean;
}

type View =
  | 'unusable'
  | 'choose'
  | 'blocked'
  | 'new-form'
  | 'existing-form'
  | 'failure'
  | 'success-new'
  | 'success-existing';

function passwordsMatchValidator(group: AbstractControl): ValidationErrors | null {
  const p = group.get('password')?.value;
  const c = group.get('confirmPassword')?.value;
  return p && c && p !== c ? { mismatch: true } : null;
}

@Component({
  selector: 'app-accept-invitation',
  standalone: true,
  imports: [
    ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule
  ],
  styles: [`
    .invite-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px 16px;
      background: linear-gradient(135deg, #1a1f36 0%, #2d3a6e 100%);
    }
    .invite-card {
      width: 100%;
      max-width: 420px;
      padding: 28px;
      border-radius: 16px !important;
    }
    .invite-brand {
      text-align: center;
      margin-bottom: 20px;
    }
    .invite-brand .logo { font-size: 2rem; display: block; margin-bottom: 6px; }
    .invite-brand h1 { margin: 0; font-size: 1.4rem; font-weight: 700; color: #1a1f36; }
    .invite-brand p { margin: 6px 0 0; font-size: 0.85rem; color: #6c757d; }
    .invite-form { display: flex; flex-direction: column; gap: 4px; }
    .full-width { width: 100%; }
    .invite-btn { margin-top: 12px; height: 46px; font-size: 1rem; font-weight: 600; }
    .invite-choice-btn { height: 52px; font-size: 0.95rem; }
    .invite-error {
      color: #b91c1c;
      font-size: 0.85rem;
      margin: 4px 0 8px;
    }
    .invite-status {
      text-align: center;
      padding: 24px 0;
    }
    .invite-status mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
    }
    .invite-status h2 { margin: 16px 0 8px; color: #1a1f36; font-size: 1.2rem; }
    .invite-status p { margin: 0; color: #6c757d; font-size: 0.9rem; line-height: 1.5; }
    .invite-signed-in {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 0.85rem;
      color: #374151;
      margin-bottom: 16px;
      word-break: break-word;
    }
    .invite-actions { display: flex; flex-direction: column; gap: 10px; margin-top: 8px; }
    .invite-link-btn { align-self: center; margin-top: 4px; }
  `],
  template: `
    <div class="invite-page">
      <mat-card class="invite-card">

        <div class="invite-brand">
          <span class="logo">🪷</span>
          <h1>LasyaRasa Hub</h1>
          <p>Accept Invitation</p>
        </div>

        @if (view() === 'unusable') {
          <div class="invite-status">
            <mat-icon style="color:#ef4444">link_off</mat-icon>
            <h2>Invitation unavailable</h2>
            <p>This invitation could not be accepted. The link may be invalid or no longer available.</p>
          </div>
        }

        @if (view() === 'choose') {
          <div class="invite-actions">
            <button mat-flat-button color="primary" class="full-width invite-choice-btn" (click)="chooseNew()">
              Create a new account
            </button>
            <button mat-stroked-button class="full-width invite-choice-btn" (click)="chooseExisting()">
              I already have an account
            </button>
          </div>
        }

        @if (view() === 'blocked') {
          <div class="invite-status" style="padding-top:0">
            <p style="margin-bottom:12px">You're currently signed in.</p>
          </div>
          @if (auth.currentUser()?.email) {
            <div class="invite-signed-in">Signed in as {{ auth.currentUser()?.email }}</div>
          }
          <p style="color:#6c757d;font-size:0.85rem;margin:0 0 16px">
            To accept this invitation, please sign out first and choose an option again.
          </p>
          <div class="invite-actions">
            <button mat-flat-button color="primary" class="full-width" (click)="signOut()">Sign Out</button>
            <button mat-button class="full-width" (click)="backToChooser()">Back</button>
          </div>
        }

        @if (view() === 'new-form') {
          <form class="invite-form" [formGroup]="newAccountForm" (ngSubmit)="submitNewAccount()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>New password</mat-label>
              <input matInput formControlName="password" [type]="hideNewPassword ? 'password' : 'text'" autocomplete="new-password" />
              <button mat-icon-button matSuffix type="button" (click)="hideNewPassword = !hideNewPassword">
                <mat-icon>{{ hideNewPassword ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Confirm password</mat-label>
              <input matInput formControlName="confirmPassword" [type]="hideConfirmPassword ? 'password' : 'text'" autocomplete="new-password" />
              <button mat-icon-button matSuffix type="button" (click)="hideConfirmPassword = !hideConfirmPassword">
                <mat-icon>{{ hideConfirmPassword ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
            </mat-form-field>

            @if (newAccountForm.errors?.['mismatch'] && newAccountForm.get('confirmPassword')?.touched) {
              <p class="invite-error">Passwords do not match.</p>
            }

            <button mat-flat-button color="primary" type="submit" class="full-width invite-btn"
                    [disabled]="newAccountForm.invalid || submitting()">
              @if (submitting()) {
                <mat-spinner diameter="20" />
              } @else {
                Create Account
              }
            </button>
            <button mat-button type="button" class="full-width invite-link-btn" [disabled]="submitting()" (click)="backToChooser()">
              Back
            </button>
          </form>
        }

        @if (view() === 'existing-form') {
          <form class="invite-form" [formGroup]="loginForm" (ngSubmit)="submitExistingAccount()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Email</mat-label>
              <input matInput formControlName="email" type="email" autocomplete="email" />
              <mat-icon matSuffix>email</mat-icon>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Password</mat-label>
              <input matInput formControlName="password" [type]="hideLoginPassword ? 'password' : 'text'" autocomplete="current-password" />
              <button mat-icon-button matSuffix type="button" (click)="hideLoginPassword = !hideLoginPassword">
                <mat-icon>{{ hideLoginPassword ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
            </mat-form-field>

            @if (loginError()) {
              <p class="invite-error">{{ loginError() }}</p>
            }

            <button mat-flat-button color="primary" type="submit" class="full-width invite-btn"
                    [disabled]="loginForm.invalid || submitting()">
              @if (submitting()) {
                <mat-spinner diameter="20" />
              } @else {
                Sign In &amp; Accept
              }
            </button>
            <button mat-button type="button" class="full-width invite-link-btn" [disabled]="submitting()" (click)="backToChooser()">
              Back
            </button>
          </form>
        }

        @if (view() === 'failure') {
          <div class="invite-status">
            <mat-icon style="color:#ef4444">error_outline</mat-icon>
            <h2>Something went wrong</h2>
            <p>This invitation could not be accepted. The link may be invalid or no longer available.</p>
          </div>
          <div class="invite-actions">
            <button mat-flat-button color="primary" class="full-width" (click)="retry()">Try Again</button>
            <button mat-button class="full-width" (click)="backToChooser()">Back to options</button>
          </div>
        }

        @if (view() === 'success-new') {
          <div class="invite-status">
            <mat-icon style="color:#16a34a">check_circle</mat-icon>
            <h2>Account created</h2>
            <p>Your account has been created successfully and you now have {{ purposeLabel() }}.</p>
          </div>
          <button mat-flat-button color="primary" class="full-width invite-btn" (click)="goToLogin()">Sign In</button>
        }

        @if (view() === 'success-existing') {
          <div class="invite-status">
            <mat-icon style="color:#16a34a">check_circle</mat-icon>
            <h2>Access granted</h2>
            <p>You now have {{ purposeLabel() }} on your account.</p>
            <p>Access has been added to your account. You can close this page.</p>
          </div>
        }

      </mat-card>
    </div>
  `
})
export class AcceptInvitationComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);
  private fb = inject(FormBuilder);
  auth = inject(AuthService);

  private invitationToken: string | null = null;
  private lastMode: 'new' | 'existing' | null = null;

  view = signal<View>('choose');
  submitting = signal(false);
  loginError = signal('');
  private result = signal<AcceptInvitationResponse | null>(null);

  hideNewPassword = true;
  hideConfirmPassword = true;
  hideLoginPassword = true;

  newAccountForm = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required]
  }, { validators: passwordsMatchValidator });

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  ngOnInit() {
    const token = this.route.snapshot.queryParamMap.get('token');
    this.location.replaceState('/accept-invitation');

    if (!token) {
      this.view.set('unusable');
      return;
    }
    this.invitationToken = token;
    this.view.set('choose');
  }

  ngOnDestroy() {
    this.invitationToken = null;
  }

  purposeLabel(): string {
    const purpose = this.result()?.purpose;
    return purpose ? purpose.toLowerCase().replace(/_/g, ' ') : 'access';
  }

  chooseNew() {
    this.lastMode = 'new';
    this.view.set(this.auth.isLoggedIn() ? 'blocked' : 'new-form');
  }

  chooseExisting() {
    this.lastMode = 'existing';
    this.view.set(this.auth.isLoggedIn() ? 'blocked' : 'existing-form');
  }

  backToChooser() {
    this.newAccountForm.reset();
    this.loginForm.reset();
    this.loginError.set('');
    this.view.set('choose');
  }

  signOut() {
    this.auth.clearSession();
    this.backToChooser();
  }

  retry() {
    this.loginError.set('');
    if (this.lastMode === 'new') {
      this.view.set(this.auth.isLoggedIn() ? 'blocked' : 'new-form');
    } else if (this.lastMode === 'existing') {
      this.view.set(this.auth.isLoggedIn() ? 'blocked' : 'existing-form');
    } else {
      this.view.set('choose');
    }
  }

  submitNewAccount() {
    if (this.newAccountForm.invalid || this.submitting() || this.auth.isLoggedIn() || !this.invitationToken) return;

    this.submitting.set(true);
    this.lastMode = 'new';
    const { password, confirmPassword } = this.newAccountForm.value;
    const token = this.invitationToken;
    const payload: AcceptInvitationRequest = {
      token,
      newPassword: password!,
      confirmPassword: confirmPassword!
    };

    this.http.post<AcceptInvitationResponse>(`${environment.apiUrl}/public/invitations/accept`, payload)
      .subscribe({
        next: (res) => {
          this.submitting.set(false);
          this.result.set(res);
          this.invitationToken = null;
          this.newAccountForm.reset();
          this.view.set('success-new');
        },
        error: () => {
          this.submitting.set(false);
          this.newAccountForm.reset();
          this.view.set('failure');
        }
      });
  }

  submitExistingAccount() {
    if (this.loginForm.invalid || this.submitting() || this.auth.isLoggedIn() || !this.invitationToken) return;

    this.submitting.set(true);
    this.lastMode = 'existing';
    this.loginError.set('');
    const { email, password } = this.loginForm.value;
    const token = this.invitationToken;

    this.auth.login(email!, password!).subscribe({
      next: () => {
        const payload: AcceptInvitationRequest = {
          token,
          newPassword: null,
          confirmPassword: null
        };
        this.http.post<AcceptInvitationResponse>(`${environment.apiUrl}/public/invitations/accept`, payload)
          .subscribe({
            next: (res) => {
              this.submitting.set(false);
              this.result.set(res);
              this.invitationToken = null;
              this.loginForm.reset();
              this.view.set('success-existing');
            },
            error: () => {
              this.submitting.set(false);
              this.loginForm.reset();
              this.view.set('failure');
            }
          });
      },
      error: () => {
        this.submitting.set(false);
        this.loginForm.patchValue({ password: '' });
        this.loginError.set('Invalid email or password.');
      }
    });
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}
