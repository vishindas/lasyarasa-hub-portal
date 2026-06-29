import { Component, inject, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { environment } from '../../../environments/environment';

interface FormConfig {
  showAddress: boolean;
  showEmergencyContact: boolean;
  showDanceExperience: boolean;
  showPhotoConsent: boolean;
  showTerms: boolean;
  termsText: string | null;
}

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule,
            MatButtonModule, MatRadioModule, MatDividerModule, MatIconModule, MatCheckboxModule],
  styles: [`
    .section-title { font-size:0.82rem; font-weight:700; text-transform:uppercase;
                     letter-spacing:.06em; color:#6b7280; margin:0 }
    .terms-box { background:#f9fafb; border:1px solid #e5e7eb; border-radius:6px;
                 padding:16px; max-height:240px; overflow-y:auto;
                 font-size:0.85rem; color:#374151; white-space:pre-wrap; line-height:1.6 }
  `],
  template: `
    <div style="min-height:100vh;background:#f8f9fb;display:flex;align-items:flex-start;justify-content:center;padding:40px 16px">
      <div style="width:100%;max-width:580px">

        @if (state() === 'loading') {
          <div style="text-align:center;padding:80px 0;color:#6b7280">Loading…</div>
        }

        @if (state() === 'invalid') {
          <div style="text-align:center;padding:80px 0">
            <mat-icon style="font-size:48px;color:#ef4444;width:48px;height:48px">link_off</mat-icon>
            <p style="color:#6b7280;margin-top:16px">This registration link is invalid or has expired.</p>
          </div>
        }

        @if (state() === 'submitted') {
          <div style="text-align:center;padding:80px 0">
            <mat-icon style="font-size:56px;color:#16a34a;width:56px;height:56px">check_circle</mat-icon>
            <h2 style="margin:16px 0 8px;color:#111827">Registration Submitted!</h2>
            <p style="color:#6b7280;max-width:380px;margin:0 auto">
              Thank you. The school will review your registration and get in touch with you soon.
            </p>
          </div>
        }

        @if (state() === 'form') {
          <div style="text-align:center;margin-bottom:32px">
            <h1 style="margin:0 0 6px;color:#1a1f36;font-size:1.6rem">{{ providerName() }}</h1>
            <p style="margin:0;color:#6b7280;font-size:0.95rem">Student Registration</p>
          </div>

          <div style="background:#fff;border-radius:12px;padding:28px 32px;box-shadow:0 1px 4px rgba(0,0,0,.08)">
            <form [formGroup]="form" (ngSubmit)="submit()" style="display:flex;flex-direction:column;gap:16px">

              <!-- Who is registering -->
              <div>
                <p class="section-title" style="margin-bottom:10px">Who are you registering?</p>
                <mat-radio-group formControlName="registrantType" style="display:flex;gap:24px">
                  <mat-radio-button value="PARENT">A child (I am the parent/guardian)</mat-radio-button>
                  <mat-radio-button value="SELF">Myself (adult student)</mat-radio-button>
                </mat-radio-group>
              </div>

              <mat-divider></mat-divider>

              <!-- Basic Info -->
              <p class="section-title">{{ isParent() ? "Child's Details" : 'Your Details' }}</p>

              <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
                <mat-form-field appearance="outline">
                  <mat-label>First Name*</mat-label>
                  <input matInput formControlName="firstName" />
                  <mat-error>First name is required</mat-error>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Last Name*</mat-label>
                  <input matInput formControlName="lastName" />
                  <mat-error>Last name is required</mat-error>
                </mat-form-field>
              </div>

              <mat-form-field appearance="outline">
                <mat-label>Date of Birth</mat-label>
                <input matInput type="date" formControlName="dateOfBirth" />
              </mat-form-field>

              @if (!isParent()) {
                <mat-form-field appearance="outline">
                  <mat-label>Phone</mat-label>
                  <input matInput formControlName="phone" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Email</mat-label>
                  <input matInput type="email" formControlName="email" />
                </mat-form-field>
              }

              <!-- Address -->
              @if (cfg().showAddress) {
                <mat-divider></mat-divider>
                <p class="section-title">Address</p>
                <mat-form-field appearance="outline">
                  <mat-label>Street Address</mat-label>
                  <input matInput formControlName="address" />
                </mat-form-field>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
                  <mat-form-field appearance="outline">
                    <mat-label>City</mat-label>
                    <input matInput formControlName="city" />
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>State</mat-label>
                    <input matInput formControlName="state" />
                  </mat-form-field>
                </div>
                <mat-form-field appearance="outline">
                  <mat-label>Zip / Postal Code</mat-label>
                  <input matInput formControlName="zipCode" />
                </mat-form-field>
              }

              <!-- Emergency Contact -->
              @if (cfg().showEmergencyContact) {
                <mat-divider></mat-divider>
                <p class="section-title">Emergency Contact</p>
                <mat-form-field appearance="outline">
                  <mat-label>Contact Name</mat-label>
                  <input matInput formControlName="emergencyContactName" />
                </mat-form-field>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
                  <mat-form-field appearance="outline">
                    <mat-label>Relationship</mat-label>
                    <input matInput formControlName="emergencyContactRelationship" placeholder="e.g. Mother, Spouse" />
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Phone</mat-label>
                    <input matInput formControlName="emergencyContactPhone" />
                  </mat-form-field>
                </div>
              }

              <!-- Parent / Guardian (auto-shown for PARENT type) -->
              @if (isParent()) {
                <mat-divider></mat-divider>
                <p class="section-title">Parent / Guardian Details</p>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
                  <mat-form-field appearance="outline">
                    <mat-label>First Name</mat-label>
                    <input matInput formControlName="guardianFirstName" />
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Last Name</mat-label>
                    <input matInput formControlName="guardianLastName" />
                  </mat-form-field>
                </div>
                <mat-form-field appearance="outline">
                  <mat-label>Phone</mat-label>
                  <input matInput formControlName="guardianPhone" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Email</mat-label>
                  <input matInput type="email" formControlName="guardianEmail" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Relationship to Child</mat-label>
                  <mat-select formControlName="guardianRelationship">
                    <mat-option value="MOTHER">Mother</mat-option>
                    <mat-option value="FATHER">Father</mat-option>
                    <mat-option value="GUARDIAN">Guardian</mat-option>
                    <mat-option value="OTHER">Other</mat-option>
                  </mat-select>
                </mat-form-field>
              }

              <!-- Dance Experience -->
              @if (cfg().showDanceExperience) {
                <mat-divider></mat-divider>
                <p class="section-title">Dance Experience &amp; Preferences</p>
                <mat-form-field appearance="outline">
                  <mat-label>Previous dance experience (if any)</mat-label>
                  <textarea matInput formControlName="previousExperience" rows="3"
                            placeholder="e.g. 2 years Bharatanatyam at XYZ academy…"></textarea>
                </mat-form-field>
                @if (danceStyles().length > 0) {
                  <mat-form-field appearance="outline">
                    <mat-label>Preferred dance style</mat-label>
                    <mat-select formControlName="styleInterest">
                      <mat-option value="">— Not sure yet —</mat-option>
                      @for (s of danceStyles(); track s) {
                        <mat-option [value]="s">{{ s }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                }
              } @else if (danceStyles().length > 0) {
                <mat-form-field appearance="outline">
                  <mat-label>Interested in learning</mat-label>
                  <mat-select formControlName="styleInterest">
                    <mat-option value="">— Not sure yet —</mat-option>
                    @for (s of danceStyles(); track s) {
                      <mat-option [value]="s">{{ s }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
              }

              <!-- Additional Notes -->
              <mat-form-field appearance="outline">
                <mat-label>Additional notes (optional)</mat-label>
                <textarea matInput formControlName="notes" rows="2"
                          placeholder="Any information you'd like the school to know…"></textarea>
              </mat-form-field>

              <!-- Photo Release Consent -->
              @if (cfg().showPhotoConsent) {
                <mat-divider></mat-divider>
                <mat-checkbox formControlName="photoConsent">
                  We may take photos or videos during classes and events for promotional purposes.
                  I consent to having my / my child's image used by {{ providerName() }}.
                </mat-checkbox>
              }

              <!-- Terms & Conditions -->
              @if (cfg().showTerms && cfg().termsText) {
                <mat-divider></mat-divider>
                <p class="section-title">Terms &amp; Conditions</p>
                <div class="terms-box">{{ cfg().termsText }}</div>
                <mat-checkbox formControlName="termsAccepted" [required]="true">
                  I have read and agree to the terms and conditions
                </mat-checkbox>
              }

              <button mat-flat-button color="primary" type="submit"
                      [disabled]="form.invalid || submitting() || (cfg().showTerms && cfg().termsText && !form.value.termsAccepted)"
                      style="height:44px;font-size:1rem;margin-top:4px">
                {{ submitting() ? 'Submitting…' : 'Submit Registration' }}
              </button>

            </form>
          </div>
        }

      </div>
    </div>
  `
})
export class RegisterPageComponent implements OnInit {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);

  state = signal<'loading' | 'invalid' | 'form' | 'submitted'>('loading');
  providerName = signal('');
  danceStyles = signal<string[]>([]);
  submitting = signal(false);
  cfg = signal<FormConfig>({
    showAddress: false, showEmergencyContact: false, showDanceExperience: true,
    showPhotoConsent: false, showTerms: false, termsText: null
  });

  form = this.fb.group({
    registrantType:               ['PARENT', Validators.required],
    firstName:                    ['', Validators.required],
    lastName:                     ['', Validators.required],
    dateOfBirth:                  [''],
    phone:                        [''],
    email:                        [''],
    // Address
    address:                      [''],
    city:                         [''],
    state:                        [''],
    zipCode:                      [''],
    // Emergency contact
    emergencyContactName:         [''],
    emergencyContactRelationship: [''],
    emergencyContactPhone:        [''],
    // Guardian
    guardianFirstName:            [''],
    guardianLastName:             [''],
    guardianPhone:                [''],
    guardianEmail:                [''],
    guardianRelationship:         ['MOTHER'],
    // Dance
    previousExperience:           [''],
    styleInterest:                [''],
    notes:                        [''],
    // Consent
    photoConsent:                 [false],
    termsAccepted:                [false]
  });

  isParent = () => this.form.get('registrantType')?.value === 'PARENT';

  ngOnInit() {
    const token = this.route.snapshot.paramMap.get('token')!;
    this.http.get<{ providerName: string; danceStyles: string[]; formConfig: FormConfig }>(
      `${environment.apiUrl}/public/register/${token}`
    ).subscribe({
      next: (info) => {
        this.providerName.set(info.providerName);
        this.danceStyles.set(info.danceStyles);
        const raw = info.formConfig ?? this.cfg();
        this.cfg.set({
          ...raw,
          // showTerms is only meaningful if actual text exists
          showTerms: raw.showTerms && !!raw.termsText
        });
        this.state.set('form');
      },
      error: () => this.state.set('invalid')
    });
  }

  submit() {
    if (this.form.invalid) return;
    this.submitting.set(true);
    const token = this.route.snapshot.paramMap.get('token')!;
    const v = this.form.value;
    const payload = {
      ...v,
      dateOfBirth: v.dateOfBirth || null,
      guardianFirstName:    this.isParent() ? v.guardianFirstName : null,
      guardianLastName:     this.isParent() ? v.guardianLastName  : null,
      guardianPhone:        this.isParent() ? v.guardianPhone     : null,
      guardianEmail:        this.isParent() ? v.guardianEmail     : null,
      guardianRelationship: this.isParent() ? v.guardianRelationship : null,
    };
    this.http.post(`${environment.apiUrl}/public/register/${token}`, payload)
      .subscribe({
        next:  () => { this.submitting.set(false); this.state.set('submitted'); },
        error: () => this.submitting.set(false)
      });
  }
}
