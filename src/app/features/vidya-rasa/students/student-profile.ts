import { Component, inject, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { CurrencyPipe, DatePipe, TitleCasePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule } from '@angular/material/table';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { environment } from '../../../../environments/environment';
import { AgeGroup, DanceStyle, FeeTier } from '../../../core/models/settings.model';
import { CurrencyService } from '../../../core/services/currency.service';
import { StudentFormDialog } from './student-form-dialog';
import { FeeFormDialog, FeeDialogData } from '../fees/fee-form-dialog';
import { FeeOverrideDialog, FeeOverrideDialogData } from './fee-override-dialog';

interface EnrollmentDetail {
  id: number; classId: number; className: string; danceStyleId: number; danceStyleName: string;
  feeTierId: number; feeTierLabel: string; status: string; startDate: string;
  resolvedFeeAmount: number | null;
}

interface FeeOverride {
  id: number; enrollmentId: number; className: string;
  amount: number; reason: string; effectiveFrom: string; effectiveTo: string | null;
}

interface GuardianDetail {
  id: number; firstName: string; lastName: string; email: string;
  phone: string; relationship: string; primary: boolean; linkNotes: string;
}

interface NoteDetail {
  id: number; note: string; createdAt: string;
}

interface StudentDetailData {
  student: {
    id: number; firstName: string; lastName: string; email: string; phone: string;
    dateOfBirth: string; enrollmentStatus: string; joinedDate: string; ageGroupLabel: string;
    address: string; city: string; state: string; zipCode: string;
    emergencyContactName: string; emergencyContactRelationship: string; emergencyContactPhone: string;
    previousExperience: string;
    photoConsent: boolean | null; termsAccepted: boolean | null;
  };
  guardians: GuardianDetail[];
  notes: NoteDetail[];
  enrollments: EnrollmentDetail[];
}

interface FeeTierItem { tierId: number; tierLabel: string; amount: number; }

interface FeeRecord {
  id: number; feeTierId: number; feeTierLabel: string;
  feeTiers?: FeeTierItem[];
  amount: number; dueDate: string; paidAt: string;
  status: string; paidBy: string; notes: string;
}

@Component({
  selector: 'app-student-profile',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, TitleCasePipe, MatButtonModule, MatIconModule,
            MatCardModule, MatDividerModule, MatTableModule, MatDialogModule, MatMenuModule, MatSnackBarModule],
  styles: [`
    .profile-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .section-label {
      font-size: 0.72rem; font-weight: 700; letter-spacing: 0.07em;
      text-transform: uppercase; color: #6c757d; margin: 0 0 12px;
    }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 24px; }
    .info-item { display: flex; flex-direction: column; }
    .info-label { font-size: 0.72rem; color: #adb5bd; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
    .info-value { font-size: 0.88rem; color: #1a1f36; margin-top: 2px; }
    .enroll-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 8px 12px; background: #f8f9fb; border-radius: 8px; margin-bottom: 6px;
    }
    .enroll-style { font-weight: 600; font-size: 0.88rem; color: #1a1f36; }
    .enroll-tier { font-size: 0.82rem; color: #6c757d; }
    .guardian-row {
      display: flex; align-items: flex-start; justify-content: space-between;
      padding: 10px 12px; background: #f8f9fb; border-radius: 8px; margin-bottom: 6px;
    }
    .guardian-name { font-weight: 600; font-size: 0.88rem; color: #1a1f36; }
    .guardian-sub { font-size: 0.8rem; color: #6c757d; }
    .primary-badge {
      font-size: 0.68rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase;
      background: #eef0fb; color: #3d4ed8; padding: 2px 7px; border-radius: 10px;
      white-space: nowrap;
    }
    .note-row { padding: 8px 0; border-bottom: 1px solid #f0f1f5; }
    .note-date { font-size: 0.75rem; color: #adb5bd; margin-top: 2px; }
    .empty-hint { font-size: 0.82rem; color: #adb5bd; margin: 0; }
    .fee-table { width: 100%; font-size: 0.85rem; }
    .fee-table th { font-size: 0.72rem; font-weight: 700; color: #6c757d; }
    @media (max-width: 768px) { .profile-grid { grid-template-columns: 1fr; } }
  `],
  template: `
    @if (detail(); as d) {

      <div class="page-header">
        <div style="display:flex;align-items:center;gap:6px">
          <button mat-icon-button (click)="goBack()" title="Back to Students">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <div>
            <h2 style="margin:0">{{ d.student.firstName }} {{ d.student.lastName }}</h2>
            <p class="page-subtitle" style="margin:4px 0 0">
              <span class="status-chip status-{{ d.student.enrollmentStatus?.toLowerCase() }}">
                {{ d.student.enrollmentStatus | titlecase }}
              </span>
              @if (d.student.ageGroupLabel) { &nbsp;·&nbsp;{{ d.student.ageGroupLabel }} }
              @if (d.student.joinedDate) { &nbsp;·&nbsp;Joined {{ d.student.joinedDate | date:'mediumDate' }} }
            </p>
          </div>
        </div>
        <button mat-flat-button color="primary" (click)="openEdit()">
          <mat-icon>edit</mat-icon> Edit Student
        </button>
      </div>

      <div class="profile-grid">

        <!-- Left column -->
        <div style="display:flex;flex-direction:column;gap:16px">

          <mat-card>
            <mat-card-content style="padding-top:16px">
              <p class="section-label">Contact Information</p>
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">Phone</span>
                  <span class="info-value">{{ d.student.phone || '—' }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Email</span>
                  <span class="info-value">{{ d.student.email || '—' }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Date of Birth</span>
                  <span class="info-value">
                    {{ d.student.dateOfBirth ? (d.student.dateOfBirth | date:'mediumDate') : '—' }}
                  </span>
                </div>
              </div>

              @if (d.student.previousExperience) {
                <mat-divider style="margin:12px 0"></mat-divider>
                <p class="section-label" style="margin-bottom:6px">Previous Experience</p>
                <p style="font-size:0.88rem;color:#1a1f36;margin:0;white-space:pre-wrap">{{ d.student.previousExperience }}</p>
              }

              @if (d.student.photoConsent !== null || d.student.termsAccepted !== null) {
                <mat-divider style="margin:12px 0"></mat-divider>
                <p class="section-label" style="margin-bottom:8px">Consents</p>
                @if (d.student.photoConsent !== null) {
                  <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                    <mat-icon style="font-size:18px;width:18px;height:18px;color:{{ d.student.photoConsent ? '#16a34a' : '#dc2626' }}">
                      {{ d.student.photoConsent ? 'check_circle' : 'cancel' }}
                    </mat-icon>
                    <span style="font-size:0.85rem">Photo consent — <strong>{{ d.student.photoConsent ? 'Agreed' : 'Declined' }}</strong></span>
                  </div>
                }
                @if (d.student.termsAccepted !== null) {
                  <div style="display:flex;align-items:center;gap:8px">
                    <mat-icon style="font-size:18px;width:18px;height:18px;color:{{ d.student.termsAccepted ? '#16a34a' : '#dc2626' }}">
                      {{ d.student.termsAccepted ? 'check_circle' : 'cancel' }}
                    </mat-icon>
                    <span style="font-size:0.85rem">Terms &amp; conditions — <strong>{{ d.student.termsAccepted ? 'Accepted' : 'Not accepted' }}</strong></span>
                  </div>
                }
              }
            </mat-card-content>
          </mat-card>

          @if (d.student.address || d.student.city) {
            <mat-card>
              <mat-card-content style="padding-top:16px">
                <p class="section-label">Address</p>
                <div class="info-grid">
                  @if (d.student.address) {
                    <div class="info-item" style="grid-column:1/-1">
                      <span class="info-label">Street</span>
                      <span class="info-value">{{ d.student.address }}</span>
                    </div>
                  }
                  @if (d.student.city) {
                    <div class="info-item">
                      <span class="info-label">City</span>
                      <span class="info-value">{{ d.student.city }}</span>
                    </div>
                  }
                  @if (d.student.state) {
                    <div class="info-item">
                      <span class="info-label">State</span>
                      <span class="info-value">{{ d.student.state }}</span>
                    </div>
                  }
                  @if (d.student.zipCode) {
                    <div class="info-item">
                      <span class="info-label">Zip Code</span>
                      <span class="info-value">{{ d.student.zipCode }}</span>
                    </div>
                  }
                </div>
              </mat-card-content>
            </mat-card>
          }

          @if (d.student.emergencyContactName) {
            <mat-card>
              <mat-card-content style="padding-top:16px">
                <p class="section-label">Emergency Contact</p>
                <div class="info-grid">
                  <div class="info-item">
                    <span class="info-label">Name</span>
                    <span class="info-value">{{ d.student.emergencyContactName }}</span>
                  </div>
                  @if (d.student.emergencyContactRelationship) {
                    <div class="info-item">
                      <span class="info-label">Relationship</span>
                      <span class="info-value">{{ d.student.emergencyContactRelationship }}</span>
                    </div>
                  }
                  @if (d.student.emergencyContactPhone) {
                    <div class="info-item">
                      <span class="info-label">Phone</span>
                      <span class="info-value">{{ d.student.emergencyContactPhone }}</span>
                    </div>
                  }
                </div>
              </mat-card-content>
            </mat-card>
          }

          <mat-card>
            <mat-card-content style="padding-top:16px">
              <p class="section-label">Guardians / Payers ({{ d.guardians.length }})</p>
              @for (g of d.guardians; track g.id) {
                <div class="guardian-row">
                  <div>
                    <div class="guardian-name">{{ g.firstName }} {{ g.lastName }}</div>
                    <div class="guardian-sub">
                      {{ g.relationship | titlecase }}
                      @if (g.phone) { &nbsp;·&nbsp;{{ g.phone }} }
                      @if (g.email) { &nbsp;·&nbsp;{{ g.email }} }
                    </div>
                  </div>
                  @if (g.primary) { <span class="primary-badge">Primary</span> }
                </div>
              }
              @if (!d.guardians.length) {
                <p class="empty-hint">No guardians recorded.</p>
              }
            </mat-card-content>
          </mat-card>

        </div>

        <!-- Right column -->
        <div style="display:flex;flex-direction:column;gap:16px">

          <mat-card>
            <mat-card-content style="padding-top:16px">
              <p class="section-label">Dance Style Enrollments ({{ d.enrollments.length }})</p>
              @for (e of d.enrollments; track e.id) {
                <div class="enroll-row">
                  <div>
                    <div class="enroll-style">{{ e.danceStyleName || 'Style #' + e.danceStyleId }}</div>
                    <div class="enroll-tier">
                      {{ e.feeTierLabel || 'Tier #' + e.feeTierId }}
                      @if (e.resolvedFeeAmount != null) {
                        <span style="color:#3d4ed8;font-weight:600;margin-left:6px">
                          {{ e.resolvedFeeAmount | currency:currencyService.currency() }}/mo
                        </span>
                      }
                    </div>
                  </div>
                  <span class="status-chip status-{{ e.status?.toLowerCase() }}">{{ e.status | titlecase }}</span>
                </div>
              }
              @if (!d.enrollments.length) {
                <p class="empty-hint">No enrollments recorded.</p>
              }
            </mat-card-content>
          </mat-card>

          <mat-card>
            <mat-card-content style="padding-top:16px">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
                <p class="section-label" style="margin:0">Fee Overrides ({{ overrides().length }})</p>
                <button mat-stroked-button style="font-size:0.8rem"
                        (click)="openAddOverride(d.student.id, d.enrollments)">
                  <mat-icon style="font-size:18px;width:18px;height:18px">add</mat-icon> Add Override
                </button>
              </div>
              @for (o of overrides(); track o.id) {
                <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f0f0f0">
                  <div>
                    <div style="font-size:0.88rem;font-weight:500">{{ o.className }}</div>
                    <div style="font-size:0.78rem;color:#6c757d">
                      {{ o.effectiveFrom | date:'mediumDate' }}
                      @if (o.effectiveTo) { → {{ o.effectiveTo | date:'mediumDate' }} }
                      @else { → ongoing }
                      @if (o.reason) { · {{ o.reason }} }
                    </div>
                  </div>
                  <div style="display:flex;align-items:center;gap:8px">
                    <span style="font-weight:600;color:#3d4ed8">
                      {{ o.amount | currency:currencyService.currency() }}/mo
                    </span>
                    <button mat-icon-button color="warn" style="margin-top:-4px"
                            (click)="deleteOverride(d.student.id, o.id)">
                      <mat-icon style="font-size:18px">delete_outline</mat-icon>
                    </button>
                  </div>
                </div>
              }
              @if (!overrides().length) {
                <p class="empty-hint">No custom overrides. Standard tier pricing applies.</p>
              }
            </mat-card-content>
          </mat-card>

          <mat-card>
            <mat-card-content style="padding-top:16px">
              <p class="section-label">Notes ({{ d.notes.length }})</p>
              @for (n of d.notes; track n.id) {
                <div class="note-row" style="display:flex;align-items:flex-start;justify-content:space-between">
                  <div>
                    <div style="font-size:0.88rem;color:#495057">{{ n.note }}</div>
                    <div class="note-date">{{ n.createdAt | date:'medium' }}</div>
                  </div>
                  <button mat-icon-button color="warn" style="margin-top:-4px"
                          (click)="deleteNote(d.student.id, n.id)">
                    <mat-icon style="font-size:18px">delete_outline</mat-icon>
                  </button>
                </div>
              }
              @if (!d.notes.length) {
                <p class="empty-hint">No notes recorded.</p>
              }
            </mat-card-content>
          </mat-card>

        </div>
      </div>

      <!-- Fees Table — full width below the grid -->
      <mat-card style="margin-top:16px">
        <mat-card-content style="padding-top:16px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
            <p class="section-label" style="margin:0">Fee History ({{ fees().length }})</p>
            <button mat-stroked-button color="primary" style="font-size:0.8rem" (click)="openAddFee(d.student.id, d.enrollments)">
              <mat-icon style="font-size:18px;width:18px;height:18px">add</mat-icon> Add Fee
            </button>
          </div>

          @if (fees().length) {
            <table mat-table [dataSource]="fees()" class="fee-table full-width">

              <ng-container matColumnDef="feeTier">
                <th mat-header-cell *matHeaderCellDef>Fee Tier</th>
                <td mat-cell *matCellDef="let f">
                  <span>{{ f.feeTierLabel || '—' }}</span>
                  @if (f.feeTiers?.length > 1) {
                    <button mat-button [matMenuTriggerFor]="tierMenu"
                            style="font-size:0.72rem;min-width:auto;padding:0 6px;line-height:20px;
                                   vertical-align:middle;color:#3d4ed8;font-weight:600">
                      +{{ f.feeTiers!.length - 1 }}
                    </button>
                    <mat-menu #tierMenu="matMenu">
                      @for (t of f.feeTiers!; track t.tierId) {
                        <div mat-menu-item style="font-size:0.85rem;display:flex;justify-content:space-between;gap:32px">
                          <span>{{ t.tierLabel }}</span>
                          <span style="color:#6c757d">₹{{ t.amount }}</span>
                        </div>
                      }
                    </mat-menu>
                  }
                </td>
              </ng-container>

              <ng-container matColumnDef="amount">
                <th mat-header-cell *matHeaderCellDef>Amount</th>
                <td mat-cell *matCellDef="let f">{{ f.amount | currency:currencyService.currency() }}</td>
              </ng-container>

              <ng-container matColumnDef="dueDate">
                <th mat-header-cell *matHeaderCellDef>Due Date</th>
                <td mat-cell *matCellDef="let f">{{ f.dueDate ? (f.dueDate | date:'mediumDate') : '—' }}</td>
              </ng-container>

              <ng-container matColumnDef="paidAt">
                <th mat-header-cell *matHeaderCellDef>Paid On</th>
                <td mat-cell *matCellDef="let f">{{ f.paidAt ? (f.paidAt | date:'mediumDate') : '—' }}</td>
              </ng-container>

              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Status</th>
                <td mat-cell *matCellDef="let f">
                  <span class="status-chip status-{{ f.status?.toLowerCase() }}">
                    {{ f.status | titlecase }}
                  </span>
                </td>
              </ng-container>

              <ng-container matColumnDef="paidBy">
                <th mat-header-cell *matHeaderCellDef>Paid By</th>
                <td mat-cell *matCellDef="let f">{{ f.paidBy || '—' }}</td>
              </ng-container>

              <ng-container matColumnDef="notes">
                <th mat-header-cell *matHeaderCellDef>Notes</th>
                <td mat-cell *matCellDef="let f">{{ f.notes || '—' }}</td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="feeColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: feeColumns;"></tr>
            </table>
          } @else {
            <p class="empty-hint">No fee records for this student.</p>
          }
        </mat-card-content>
      </mat-card>

    } @else {
      <p style="color:#adb5bd;padding:32px 0">Loading…</p>
    }
  `
})
export class StudentProfileComponent implements OnInit {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  currencyService = inject(CurrencyService);
  detail = signal<StudentDetailData | null>(null);
  fees = signal<FeeRecord[]>([]);
  overrides = signal<FeeOverride[]>([]);
  ageGroups = signal<AgeGroup[]>([]);
  danceStyles = signal<DanceStyle[]>([]);
  feeTiers = signal<FeeTier[]>([]);

  feeColumns = ['feeTier', 'amount', 'dueDate', 'paidAt', 'status', 'paidBy', 'notes'];

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.loadDetail(id);
    this.loadFees(id);
    this.loadOverrides(id);
    this.http.get<AgeGroup[]>(`${environment.apiUrl}/school/settings/age-groups`).subscribe(d => this.ageGroups.set(d));
    this.http.get<DanceStyle[]>(`${environment.apiUrl}/school/settings/dance-styles`).subscribe(d => this.danceStyles.set(d));
    this.http.get<FeeTier[]>(`${environment.apiUrl}/school/settings/fee-tiers`).subscribe(d => this.feeTiers.set(d));
  }

  loadDetail(id: string) {
    this.http.get<StudentDetailData>(`${environment.apiUrl}/school/v2/students/${id}`)
      .subscribe(d => this.detail.set(d));
  }

  loadFees(id: string) {
    this.http.get<FeeRecord[]>(`${environment.apiUrl}/school/fees?studentId=${id}`)
      .subscribe(d => this.fees.set(d));
  }

  loadOverrides(id: string) {
    this.http.get<FeeOverride[]>(`${environment.apiUrl}/school/v2/students/${id}/fee-overrides`)
      .subscribe(d => this.overrides.set(d));
  }

  openAddOverride(studentId: number, enrollments: EnrollmentDetail[]) {
    const data: FeeOverrideDialogData = {
      studentId,
      enrollments: enrollments.map(e => ({ id: e.id, className: e.className || e.danceStyleName || 'Class', status: e.status }))
    };
    this.dialog.open(FeeOverrideDialog, { width: '480px', data })
      .afterClosed().subscribe(saved => {
        if (saved) {
          this.loadOverrides(String(studentId));
          this.loadDetail(String(studentId));
          this.snack.open('Fee override saved', 'OK', { duration: 2500 });
        }
      });
  }

  deleteOverride(studentId: number, overrideId: number) {
    if (!confirm('Remove this fee override?')) return;
    this.http.delete(`${environment.apiUrl}/school/v2/students/${studentId}/fee-overrides/${overrideId}`)
      .subscribe(() => {
        this.loadOverrides(String(studentId));
        this.loadDetail(String(studentId));
        this.snack.open('Override removed', 'OK', { duration: 2500 });
      });
  }

  openEdit() {
    const d = this.detail();
    if (!d) return;
    this.dialog.open(StudentFormDialog, {
      width: '620px',
      maxHeight: '90vh',
      data: { studentDetail: d, ageGroups: this.ageGroups(), danceStyles: this.danceStyles(), feeTiers: this.feeTiers() }
    }).afterClosed().subscribe(saved => {
      if (saved) {
        this.loadDetail(String(d.student.id));
        this.snack.open('Student saved', 'OK', { duration: 2500 });
      }
    });
  }

  openAddFee(studentId: number, enrollments: EnrollmentDetail[]) {
    const firstEnrollment = enrollments.find(e => e.status === 'ACTIVE') ?? enrollments[0];
    const data: FeeDialogData = {
      studentId,
      feeTierId: firstEnrollment?.feeTierId,
      feeTiers: this.feeTiers()
    };
    this.dialog.open(FeeFormDialog, { width: '480px', data })
      .afterClosed().subscribe(saved => {
        if (saved) {
          this.loadFees(String(studentId));
          this.snack.open('Fee added', 'OK', { duration: 2500 });
        }
      });
  }

  deleteNote(studentId: number, noteId: number) {
    this.http.delete(`${environment.apiUrl}/school/v2/students/${studentId}/notes/${noteId}`)
      .subscribe(() => this.detail.update(d => d ? {
        ...d, notes: d.notes.filter(n => n.id !== noteId)
      } : d));
  }

  goBack() {
    this.router.navigate(['/vidya-rasa/students']);
  }
}
