import { Component, inject, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-form-builder',
  standalone: true,
  imports: [FormsModule, MatCardModule, MatButtonModule, MatIconModule,
            MatDividerModule, MatSlideToggleModule, MatFormFieldModule,
            MatInputModule, MatSnackBarModule, MatProgressBarModule],
  styles: [`
    .page-header { display:flex; align-items:center; gap:12px; margin-bottom:24px }
    .page-header h2 { margin:0; font-size:1.4rem; font-weight:600 }
    .page-header .subtitle { color:#6b7280; font-size:0.9rem; margin:2px 0 0 }
    .section-row { display:flex; align-items:center; gap:16px }
    .always-tag { font-size:0.75rem; color:#6b7280; padding:3px 10px;
                  background:#f3f4f6; border-radius:12px; white-space:nowrap }
  `],
  template: `
    <div class="page-header">
      <button mat-icon-button (click)="back()"><mat-icon>arrow_back</mat-icon></button>
      <div>
        <h2>Registration Form Builder</h2>
        <p class="subtitle">Changes save automatically when you flip a toggle</p>
      </div>
    </div>

    @if (!loaded()) {
      <mat-progress-bar mode="indeterminate"></mat-progress-bar>
    } @else {

      <!-- Basic Info — always on -->
      <mat-card style="margin-bottom:12px;padding:20px 24px">
        <div class="section-row">
          <mat-icon style="color:#6b7280">person</mat-icon>
          <div style="flex:1">
            <p style="font-weight:600;margin:0">Basic Info</p>
            <p style="margin:2px 0 0;font-size:0.82rem;color:#6b7280">Full name, date of birth, phone, email — always required</p>
          </div>
          <span class="always-tag">Always shown</span>
        </div>
      </mat-card>

      <!-- Address -->
      <mat-card style="margin-bottom:12px;padding:20px 24px">
        <div class="section-row">
          <mat-icon style="color:#6b7280">home</mat-icon>
          <div style="flex:1">
            <p style="font-weight:600;margin:0">Address</p>
            <p style="margin:2px 0 0;font-size:0.82rem;color:#6b7280">Street address, city, state, zip code</p>
          </div>
          <mat-slide-toggle [(ngModel)]="showAddress" (ngModelChange)="save()" color="primary"></mat-slide-toggle>
        </div>
      </mat-card>

      <!-- Emergency Contact -->
      <mat-card style="margin-bottom:12px;padding:20px 24px">
        <div class="section-row">
          <mat-icon style="color:#6b7280">emergency</mat-icon>
          <div style="flex:1">
            <p style="font-weight:600;margin:0">Emergency Contact</p>
            <p style="margin:2px 0 0;font-size:0.82rem;color:#6b7280">Contact name, relationship, and phone number</p>
          </div>
          <mat-slide-toggle [(ngModel)]="showEmergencyContact" (ngModelChange)="save()" color="primary"></mat-slide-toggle>
        </div>
      </mat-card>

      <!-- Dance Experience -->
      <mat-card style="margin-bottom:12px;padding:20px 24px">
        <div class="section-row">
          <mat-icon style="color:#6b7280">self_improvement</mat-icon>
          <div style="flex:1">
            <p style="font-weight:600;margin:0">Dance Experience</p>
            <p style="margin:2px 0 0;font-size:0.82rem;color:#6b7280">Previous dance experience and preferred style</p>
          </div>
          <mat-slide-toggle [(ngModel)]="showDanceExperience" (ngModelChange)="save()" color="primary"></mat-slide-toggle>
        </div>
      </mat-card>

      <!-- Parent / Guardian — always on -->
      <mat-card style="margin-bottom:12px;padding:20px 24px">
        <div class="section-row">
          <mat-icon style="color:#6b7280">family_restroom</mat-icon>
          <div style="flex:1">
            <p style="font-weight:600;margin:0">Parent / Guardian</p>
            <p style="margin:2px 0 0;font-size:0.82rem;color:#6b7280">Shown automatically when registrant type is "Child"</p>
          </div>
          <span class="always-tag">Always shown</span>
        </div>
      </mat-card>

      <!-- Photo Consent -->
      <mat-card style="margin-bottom:12px;padding:20px 24px">
        <div class="section-row">
          <mat-icon style="color:#6b7280">photo_camera</mat-icon>
          <div style="flex:1">
            <p style="font-weight:600;margin:0">Photo Release Consent</p>
            <p style="margin:2px 0 0;font-size:0.82rem;color:#6b7280">Checkbox: consent to use photos/videos for promotion</p>
          </div>
          <mat-slide-toggle [(ngModel)]="showPhotoConsent" (ngModelChange)="save()" color="primary"></mat-slide-toggle>
        </div>
      </mat-card>

      <!-- Terms & Conditions -->
      <mat-card style="margin-bottom:12px;padding:20px 24px">
        <div class="section-row">
          <mat-icon style="color:#6b7280">gavel</mat-icon>
          <div style="flex:1">
            <p style="font-weight:600;margin:0">Terms &amp; Conditions</p>
            <p style="margin:2px 0 0;font-size:0.82rem;color:#6b7280">Custom agreement text with acceptance checkbox</p>
          </div>
          <mat-slide-toggle [(ngModel)]="showTerms" (ngModelChange)="save()" color="primary"></mat-slide-toggle>
        </div>

        @if (showTerms) {
          <mat-divider style="margin:16px 0"></mat-divider>
          <mat-form-field appearance="outline" style="width:100%">
            <mat-label>Terms &amp; Conditions text</mat-label>
            <textarea matInput rows="10" [(ngModel)]="termsText"
                      (blur)="save()"
                      placeholder="Enter your full terms and conditions…"></textarea>
            <mat-hint>Saved automatically when you click outside the text box</mat-hint>
          </mat-form-field>
        }
      </mat-card>

    }
  `
})
export class FormBuilderComponent implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private snack = inject(MatSnackBar);

  loaded = signal(false);

  // Plain properties — assigned once from HTTP response before toggles render
  showAddress          = true;
  showEmergencyContact = true;
  showDanceExperience  = true;
  showPhotoConsent     = false;
  showTerms            = false;
  termsText            = '';

  ngOnInit() {
    this.http.get<any>(`${environment.apiUrl}/school/registration-form-config`)
      .subscribe({
        next: c => {
          this.showAddress          = !!c.showAddress;
          this.showEmergencyContact = !!c.showEmergencyContact;
          this.showDanceExperience  = !!c.showDanceExperience;
          this.showPhotoConsent     = !!c.showPhotoConsent;
          this.showTerms            = !!c.showTerms;
          this.termsText            = c.termsText ?? '';
          this.loaded.set(true);   // toggles render now, with correct values already set
        },
        error: e => {
          this.loaded.set(true);   // still show UI on error
          this.snack.open('Could not load config: ' + (e.status || e.message), 'OK', { duration: 4000 });
        }
      });
  }

  save() {
    this.http.put(`${environment.apiUrl}/school/registration-form-config`, {
      showAddress:          this.showAddress,
      showEmergencyContact: this.showEmergencyContact,
      showDanceExperience:  this.showDanceExperience,
      showPhotoConsent:     this.showPhotoConsent,
      showTerms:            this.showTerms,
      termsText:            this.termsText
    }).subscribe({
      error: e => this.snack.open('Failed to save: ' + (e.error?.message || e.status), 'OK', { duration: 5000 })
    });
  }

  back() { this.router.navigate(['/vidya-rasa/registrations']); }
}
