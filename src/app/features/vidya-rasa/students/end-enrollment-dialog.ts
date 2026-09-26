import { Component, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { environment } from '../../../../environments/environment';

export interface EndEnrollmentDialogData {
  studentId: number;
  enrollmentId: number;
  className: string;
  rowVersion: number;
}

const REASONS = [
  { value: 'WITHDRAWN', label: 'Withdrawn' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'ADMIN_CORRECTION', label: 'Admin correction' },
  { value: 'OTHER', label: 'Other' }
];

/** Issue #66 Phase 2A. Standalone End -- never sends endReason=TRANSFERRED (reachable only from the atomic Transfer flow, Phase 2B). ADMIN_CORRECTION/OTHER require a nonblank explanation, matching V51's own DB constraint. */
@Component({
  selector: 'app-end-enrollment-dialog',
  standalone: true,
  imports: [FormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatSelectModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>End Enrollment</h2>
    <mat-dialog-content>
      <p style="margin:0 0 12px;font-size:0.9rem;color:#374151">
        End this student's enrollment in <strong>{{ data.className }}</strong>? This ends the current enrollment record; it does not delete history.
      </p>
      <mat-form-field appearance="outline" style="width:100%">
        <mat-label>Reason</mat-label>
        <mat-select [(ngModel)]="reason" cdkFocusInitial>
          @for (r of reasons; track r.value) {
            <mat-option [value]="r.value">{{ r.label }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      @if (detailsRequired()) {
        <mat-form-field appearance="outline" style="width:100%">
          <mat-label>Explanation (required)</mat-label>
          <textarea matInput [(ngModel)]="details" rows="2"></textarea>
        </mat-form-field>
      }
      @if (error()) { <p class="error">{{ error() }}</p> }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button color="warn" [disabled]="!canSubmit() || submitting()" (click)="submit()">End Enrollment</button>
    </mat-dialog-actions>
  `,
  styles: [`.error { color: #b91c1c; font-size: 0.85rem; }`]
})
export class EndEnrollmentDialog {
  private http = inject(HttpClient);
  ref = inject(MatDialogRef<EndEnrollmentDialog, boolean>);
  data: EndEnrollmentDialogData = inject(MAT_DIALOG_DATA);

  reasons = REASONS;
  reason: string | null = null;
  details = '';
  submitting = signal(false);
  error = signal<string | null>(null);
  private readonly idempotencyKey = crypto.randomUUID();

  detailsRequired(): boolean {
    return this.reason === 'ADMIN_CORRECTION' || this.reason === 'OTHER';
  }

  canSubmit(): boolean {
    if (!this.reason) return false;
    if (this.detailsRequired() && !this.details.trim()) return false;
    return true;
  }

  submit() {
    if (!this.canSubmit()) return;
    this.submitting.set(true);
    this.error.set(null);
    this.http.post(`${environment.apiUrl}/school/v2/students/${this.data.studentId}/enrollments/${this.data.enrollmentId}/end`, {
      expectedRowVersion: this.data.rowVersion,
      endReason: this.reason,
      endReasonDetails: this.detailsRequired() ? this.details.trim() : null,
      idempotencyKey: this.idempotencyKey
    }).subscribe({
      next: () => this.ref.close(true),
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        this.error.set(err.error?.message || 'Could not end this enrollment.');
      }
    });
  }
}
