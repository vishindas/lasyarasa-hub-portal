import { Component, inject, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { environment } from '../../../../environments/environment';
import { ApproveDialog } from './approve-dialog';
import { RejectDialog } from './reject-dialog';

interface Registration {
  id: number;
  registrantType: string;
  firstName: string; lastName: string;
  dateOfBirth: string; phone: string; email: string;
  guardianFirstName: string; guardianLastName: string;
  guardianPhone: string; guardianEmail: string; guardianRelationship: string;
  styleInterest: string; notes: string;
  previousExperience: string;
  address: string; city: string; state: string; zipCode: string;
  emergencyContactName: string; emergencyContactRelationship: string; emergencyContactPhone: string;
  photoConsent: boolean | null;
  termsAccepted: boolean | null;
  status: string; rejectionReason: string;
  createdAt: string;
}

@Component({
  selector: 'app-registration-detail',
  standalone: true,
  imports: [DatePipe, TitleCasePipe, MatButtonModule, MatIconModule,
            MatCardModule, MatDividerModule, MatDialogModule, MatSnackBarModule],
  styles: [`
    .page-header { display:flex; align-items:center; gap:12px; margin-bottom:24px }
    .page-header h2 { margin:0; font-size:1.4rem; font-weight:600 }
    .page-header .subtitle { color:#6b7280; font-size:0.9rem; margin:2px 0 0 }
    .grid { display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:4px }
    .field-label { font-size:0.72rem; font-weight:700; letter-spacing:.07em; text-transform:uppercase; color:#6c757d; margin:0 0 4px }
    .field-value { font-size:0.95rem; color:#212529; margin:0 }
    .field-empty { color:#adb5bd }
    .status-chip { display:inline-block; padding:3px 10px; border-radius:12px; font-size:0.75rem; font-weight:600; text-transform:uppercase }
    .status-pending { background:#fff3cd; color:#856404 }
    .status-approved { background:#d1fae5; color:#065f46 }
    .status-rejected { background:#fee2e2; color:#991b1b }
    .section-title { font-size:0.72rem; font-weight:700; letter-spacing:.07em; text-transform:uppercase; color:#6c757d; margin:0 0 16px }
    .actions { display:flex; gap:8px; margin-top:24px }
    .consent-row { display:flex; align-items:center; gap:10px; margin-bottom:10px }
    .consent-icon-yes { color:#16a34a; font-size:20px; width:20px; height:20px }
    .consent-icon-no  { color:#dc2626; font-size:20px; width:20px; height:20px }
  `],
  template: `
    @if (reg()) {
      <div class="page-header">
        <button mat-icon-button (click)="back()">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <div>
          <h2>{{ reg()!.firstName }} {{ reg()!.lastName }}</h2>
          <p class="subtitle">
            {{ reg()!.registrantType === 'PARENT' ? 'Registered by parent/guardian' : 'Self-registered adult' }}
            &nbsp;·&nbsp; Submitted {{ reg()!.createdAt | date:'mediumDate' }}
          </p>
        </div>
        <span style="margin-left:auto">
          <span class="status-chip" [class]="'status-' + reg()!.status.toLowerCase()">{{ reg()!.status }}</span>
        </span>
      </div>

      <!-- Student Details -->
      <mat-card style="margin-bottom:20px;padding:24px">
        <p class="section-title">Student Details</p>
        <div class="grid">
          <div>
            <p class="field-label">Full Name</p>
            <p class="field-value">{{ reg()!.firstName }} {{ reg()!.lastName }}</p>
          </div>
          <div>
            <p class="field-label">Date of Birth</p>
            <p class="field-value" [class.field-empty]="!reg()!.dateOfBirth">
              {{ reg()!.dateOfBirth ? (reg()!.dateOfBirth | date:'mediumDate') : '—' }}
            </p>
          </div>
          @if (reg()!.registrantType === 'SELF') {
            <div>
              <p class="field-label">Phone</p>
              <p class="field-value" [class.field-empty]="!reg()!.phone">{{ reg()!.phone || '—' }}</p>
            </div>
            <div>
              <p class="field-label">Email</p>
              <p class="field-value" [class.field-empty]="!reg()!.email">{{ reg()!.email || '—' }}</p>
            </div>
          }
        </div>

        @if (reg()!.styleInterest || reg()!.previousExperience) {
          <mat-divider style="margin:16px 0"></mat-divider>
        }
        @if (reg()!.styleInterest) {
          <p class="field-label">Style Interest</p>
          <p class="field-value" style="margin-bottom:12px">{{ reg()!.styleInterest }}</p>
        }
        @if (reg()!.previousExperience) {
          <p class="field-label">Previous Experience</p>
          <p class="field-value" style="margin-bottom:12px">{{ reg()!.previousExperience }}</p>
        }

        @if (reg()!.notes) {
          <mat-divider style="margin:16px 0"></mat-divider>
          <p class="field-label">Additional Notes</p>
          <p class="field-value">{{ reg()!.notes }}</p>
        }
      </mat-card>

      <!-- Parent / Guardian -->
      @if (reg()!.registrantType === 'PARENT') {
        <mat-card style="margin-bottom:20px;padding:24px">
          <p class="section-title">Parent / Guardian</p>
          <div class="grid">
            <div>
              <p class="field-label">Name</p>
              <p class="field-value">{{ reg()!.guardianFirstName }} {{ reg()!.guardianLastName }}</p>
            </div>
            <div>
              <p class="field-label">Relationship</p>
              <p class="field-value">{{ reg()!.guardianRelationship | titlecase }}</p>
            </div>
            <div>
              <p class="field-label">Phone</p>
              <p class="field-value" [class.field-empty]="!reg()!.guardianPhone">{{ reg()!.guardianPhone || '—' }}</p>
            </div>
            <div>
              <p class="field-label">Email</p>
              <p class="field-value" [class.field-empty]="!reg()!.guardianEmail">{{ reg()!.guardianEmail || '—' }}</p>
            </div>
          </div>
        </mat-card>
      }

      <!-- Address -->
      @if (reg()!.address || reg()!.city) {
        <mat-card style="margin-bottom:20px;padding:24px">
          <p class="section-title">Address</p>
          <div class="grid">
            @if (reg()!.address) {
              <div style="grid-column:1/-1">
                <p class="field-label">Street</p>
                <p class="field-value">{{ reg()!.address }}</p>
              </div>
            }
            @if (reg()!.city) {
              <div>
                <p class="field-label">City</p>
                <p class="field-value">{{ reg()!.city }}</p>
              </div>
            }
            @if (reg()!.state) {
              <div>
                <p class="field-label">State</p>
                <p class="field-value">{{ reg()!.state }}</p>
              </div>
            }
            @if (reg()!.zipCode) {
              <div>
                <p class="field-label">Zip Code</p>
                <p class="field-value">{{ reg()!.zipCode }}</p>
              </div>
            }
          </div>
        </mat-card>
      }

      <!-- Emergency Contact -->
      @if (reg()!.emergencyContactName) {
        <mat-card style="margin-bottom:20px;padding:24px">
          <p class="section-title">Emergency Contact</p>
          <div class="grid">
            <div>
              <p class="field-label">Name</p>
              <p class="field-value">{{ reg()!.emergencyContactName }}</p>
            </div>
            <div>
              <p class="field-label">Relationship</p>
              <p class="field-value" [class.field-empty]="!reg()!.emergencyContactRelationship">
                {{ reg()!.emergencyContactRelationship || '—' }}
              </p>
            </div>
            <div>
              <p class="field-label">Phone</p>
              <p class="field-value" [class.field-empty]="!reg()!.emergencyContactPhone">
                {{ reg()!.emergencyContactPhone || '—' }}
              </p>
            </div>
          </div>
        </mat-card>
      }

      <!-- Consents -->
      @if (reg()!.photoConsent !== null || reg()!.termsAccepted !== null) {
        <mat-card style="margin-bottom:20px;padding:24px">
          <p class="section-title">Consents</p>
          @if (reg()!.photoConsent !== null) {
            <div class="consent-row">
              <mat-icon [class]="reg()!.photoConsent ? 'consent-icon-yes' : 'consent-icon-no'">
                {{ reg()!.photoConsent ? 'check_circle' : 'cancel' }}
              </mat-icon>
              <span style="font-size:0.95rem">
                Photo release consent —
                <strong>{{ reg()!.photoConsent ? 'Agreed' : 'Declined' }}</strong>
              </span>
            </div>
          }
          @if (reg()!.termsAccepted !== null) {
            <div class="consent-row">
              <mat-icon [class]="reg()!.termsAccepted ? 'consent-icon-yes' : 'consent-icon-no'">
                {{ reg()!.termsAccepted ? 'check_circle' : 'cancel' }}
              </mat-icon>
              <span style="font-size:0.95rem">
                Terms &amp; conditions —
                <strong>{{ reg()!.termsAccepted ? 'Accepted' : 'Not accepted' }}</strong>
              </span>
            </div>
          }
        </mat-card>
      }

      <!-- Rejection reason -->
      @if (reg()!.status === 'REJECTED' && reg()!.rejectionReason) {
        <mat-card style="margin-bottom:20px;padding:24px;border-left:4px solid #ef4444">
          <p class="field-label" style="color:#991b1b">Rejection Reason</p>
          <p class="field-value">{{ reg()!.rejectionReason }}</p>
        </mat-card>
      }

      <!-- Actions -->
      @if (reg()!.status === 'PENDING') {
        <div class="actions">
          <button mat-flat-button color="primary" (click)="approve()">
            <mat-icon>check_circle</mat-icon> Approve
          </button>
          <button mat-stroked-button color="warn" (click)="reject()">
            <mat-icon>cancel</mat-icon> Reject
          </button>
        </div>
      }
    } @else {
      <div style="text-align:center;padding:80px 0;color:#adb5bd">Loading…</div>
    }
  `
})
export class RegistrationDetailComponent implements OnInit {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  reg = signal<Registration | null>(null);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.http.get<Registration>(`${environment.apiUrl}/school/registrations/${id}`)
      .subscribe(r => this.reg.set(r));
  }

  back() { this.router.navigate(['..'], { relativeTo: this.route }); }

  approve() {
    this.dialog.open(ApproveDialog, { width: '480px', data: { registration: this.reg() } })
      .afterClosed().subscribe(result => {
        if (result === undefined) return;
        const id = this.reg()!.id;
        this.http.post(`${environment.apiUrl}/school/registrations/${id}/approve`,
                       { classId: result.classId })
          .subscribe({
            next: () => {
              this.snack.open('Registration approved — student created', 'OK', { duration: 3000 });
              this.reg.update(r => r ? { ...r, status: 'APPROVED' } : r);
            },
            error: (e) => this.snack.open(e.error?.message || 'Failed to approve', 'OK', { duration: 3000 })
          });
      });
  }

  reject() {
    const r = this.reg()!;
    const email = r.registrantType === 'SELF' ? r.email : r.guardianEmail;
    this.dialog.open(RejectDialog, { data: { email } })
      .afterClosed().subscribe(result => {
        if (result === undefined) return;
        const id = r.id;
        this.http.post(`${environment.apiUrl}/school/registrations/${id}/reject`, result)
          .subscribe({
            next: () => {
              this.snack.open('Registration rejected', 'OK', { duration: 3000 });
              this.reg.update(reg => reg ? { ...reg, status: 'REJECTED', rejectionReason: result.reason } : reg);
            },
            error: () => this.snack.open('Failed to reject', 'OK', { duration: 3000 })
          });
      });
  }
}
