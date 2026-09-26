import { Component, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { environment } from '../../../../environments/environment';
import { SchoolClass } from '../../../core/models/class.model';

export interface TransferEnrollmentDialogData {
  studentId: number;
  enrollmentId: number;
  sourceClassId: number;
  sourceClassName: string;
  rowVersion: number;
  classes: SchoolClass[];
}

/** Issue #66 Phase 2B. Atomically ends the source enrollment and creates the target -- one request, one transaction. The source class is excluded from the target picker (transferring a class into itself makes no sense and the backend would reject it as a duplicate anyway). */
@Component({
  selector: 'app-transfer-enrollment-dialog',
  standalone: true,
  imports: [FormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatSelectModule],
  template: `
    <h2 mat-dialog-title>Transfer to Class</h2>
    <mat-dialog-content>
      <p style="margin:0 0 12px;font-size:0.9rem;color:#374151">
        Transfer this student from <strong>{{ data.sourceClassName }}</strong> to a new class? This ends the current enrollment and creates a new one in the destination class in a single atomic action.
      </p>
      <mat-form-field appearance="outline" style="width:100%">
        <mat-label>Destination class</mat-label>
        <mat-select [(ngModel)]="targetClassId" cdkFocusInitial>
          @for (c of targetClasses(); track c.id) {
            <mat-option [value]="c.id">{{ c.batchName }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      @if (targetClasses().length === 0) {
        <p style="font-size:0.85rem;color:#6c757d">No other active classes are available to transfer into.</p>
      }
      @if (error()) { <p class="error">{{ error() }}</p> }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button color="primary" [disabled]="!targetClassId || submitting()" (click)="submit()">Transfer</button>
    </mat-dialog-actions>
  `,
  styles: [`.error { color: #b91c1c; font-size: 0.85rem; }`]
})
export class TransferEnrollmentDialog {
  private http = inject(HttpClient);
  ref = inject(MatDialogRef<TransferEnrollmentDialog, boolean>);
  data: TransferEnrollmentDialogData = inject(MAT_DIALOG_DATA);

  targetClassId: number | null = null;
  submitting = signal(false);
  error = signal<string | null>(null);
  private readonly idempotencyKey = crypto.randomUUID();

  targetClasses = signal<SchoolClass[]>(this.data.classes.filter(c => c.id !== this.data.sourceClassId));

  submit() {
    if (this.targetClassId == null) return;
    this.submitting.set(true);
    this.error.set(null);
    this.http.post(`${environment.apiUrl}/school/v2/students/${this.data.studentId}/enrollments/${this.data.enrollmentId}/transfer`, {
      targetClassId: this.targetClassId, expectedRowVersion: this.data.rowVersion, idempotencyKey: this.idempotencyKey
    }).subscribe({
      next: () => this.ref.close(true),
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        this.error.set(err.error?.message || 'Could not transfer this enrollment.');
      }
    });
  }
}
