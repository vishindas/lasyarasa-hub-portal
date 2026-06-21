import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { DatePipe, TitleCasePipe } from '@angular/common';

interface EnrollmentDetail {
  id: number;
  danceStyleId: number;
  danceStyleName: string;
  feeTierId: number;
  feeTierLabel: string;
  status: string;
  startDate: string;
}

interface GuardianDetail {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  relationship: string;
  primary: boolean;
  linkNotes: string;
}

interface NoteDetail {
  id: number;
  note: string;
  createdAt: string;
}

interface StudentDetailData {
  student: {
    id: number; firstName: string; lastName: string; email: string; phone: string;
    dateOfBirth: string; enrollmentStatus: string; joinedDate: string; ageGroupLabel: string;
  };
  guardians: GuardianDetail[];
  notes: NoteDetail[];
  enrollments: EnrollmentDetail[];
}

@Component({
  selector: 'app-student-detail-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, MatDividerModule, DatePipe, TitleCasePipe],
  styles: [`
    .detail-container { min-width: 520px; }
    .student-name { font-size: 1.3rem; font-weight: 700; color: #1a1f36; margin: 0; }
    .student-meta { font-size: 0.85rem; color: #6c757d; margin: 4px 0 0; }
    .section-title {
      font-size: 0.72rem; font-weight: 700; letter-spacing: 0.07em;
      text-transform: uppercase; color: #6c757d; margin: 16px 0 8px;
    }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 20px; }
    .info-item { display: flex; flex-direction: column; }
    .info-label { font-size: 0.72rem; color: #adb5bd; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
    .info-value { font-size: 0.88rem; color: #1a1f36; margin-top: 2px; }
    .enrollment-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 8px 12px; background: #f8f9fb; border-radius: 8px; margin-bottom: 6px;
    }
    .enrollment-style { font-weight: 600; font-size: 0.88rem; color: #1a1f36; }
    .enrollment-tier { font-size: 0.82rem; color: #6c757d; }
    .guardian-row {
      display: flex; align-items: flex-start; justify-content: space-between;
      padding: 10px 12px; background: #f8f9fb; border-radius: 8px; margin-bottom: 6px;
    }
    .guardian-name { font-weight: 600; font-size: 0.88rem; color: #1a1f36; }
    .guardian-sub { font-size: 0.8rem; color: #6c757d; }
    .primary-badge {
      font-size: 0.68rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase;
      background: #eef0fb; color: #3d4ed8; padding: 2px 7px; border-radius: 10px;
    }
    .note-row { font-size: 0.85rem; color: #495057; padding: 6px 0; border-bottom: 1px solid #f0f1f5; }
    .note-date { font-size: 0.75rem; color: #adb5bd; margin-top: 2px; }
    .empty-hint { font-size: 0.82rem; color: #adb5bd; padding: 6px 0; }
  `],
  template: `
    <h2 mat-dialog-title style="padding-bottom: 4px">Student Profile</h2>

    <mat-dialog-content>
      <div class="detail-container">

        <!-- Header -->
        <p class="student-name">{{ d.student.firstName }} {{ d.student.lastName }}</p>
        <p class="student-meta">
          <span class="status-chip status-{{ d.student.enrollmentStatus?.toLowerCase() }}">
            {{ d.student.enrollmentStatus | titlecase }}
          </span>
          @if (d.student.ageGroupLabel) {
            &nbsp;·&nbsp;{{ d.student.ageGroupLabel }}
          }
          @if (d.student.joinedDate) {
            &nbsp;·&nbsp;Joined {{ d.student.joinedDate | date:'mediumDate' }}
          }
        </p>

        <!-- Student Info -->
        <p class="section-title">Contact</p>
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
            <span class="info-value">{{ d.student.dateOfBirth ? (d.student.dateOfBirth | date:'mediumDate') : '—' }}</span>
          </div>
        </div>

        <!-- Enrollments -->
        <mat-divider style="margin: 14px 0 0"></mat-divider>
        <p class="section-title">Dance Style Enrollments ({{ d.enrollments?.length || 0 }})</p>
        @for (e of d.enrollments; track e.id) {
          <div class="enrollment-row">
            <div>
              <div class="enrollment-style">{{ e.danceStyleName || 'Style #' + e.danceStyleId }}</div>
              <div class="enrollment-tier">{{ e.feeTierLabel || 'Tier #' + e.feeTierId }}</div>
            </div>
            <span class="status-chip status-{{ e.status?.toLowerCase() }}">{{ e.status | titlecase }}</span>
          </div>
        }
        @if (!d.enrollments?.length) {
          <p class="empty-hint">No enrollments recorded.</p>
        }

        <!-- Guardians -->
        <mat-divider style="margin: 14px 0 0"></mat-divider>
        <p class="section-title">Guardians / Payers ({{ d.guardians?.length || 0 }})</p>
        @for (g of d.guardians; track g.id) {
          <div class="guardian-row">
            <div>
              <div class="guardian-name">{{ g.firstName }} {{ g.lastName }}</div>
              <div class="guardian-sub">
                {{ g.relationship | titlecase }}
                @if (g.phone) { · {{ g.phone }} }
                @if (g.email) { · {{ g.email }} }
              </div>
            </div>
            @if (g.primary) {
              <span class="primary-badge">Primary</span>
            }
          </div>
        }
        @if (!d.guardians?.length) {
          <p class="empty-hint">No guardians recorded.</p>
        }

        <!-- Notes -->
        @if (d.notes?.length) {
          <mat-divider style="margin: 14px 0 0"></mat-divider>
          <p class="section-title">Notes ({{ d.notes.length }})</p>
          @for (n of d.notes; track n.id) {
            <div class="note-row">
              <div>{{ n.note }}</div>
              <div class="note-date">{{ n.createdAt | date:'medium' }}</div>
            </div>
          }
        }

      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-flat-button mat-dialog-close>Close</button>
    </mat-dialog-actions>
  `
})
export class StudentDetailDialog {
  d: StudentDetailData = inject(MAT_DIALOG_DATA);
}
