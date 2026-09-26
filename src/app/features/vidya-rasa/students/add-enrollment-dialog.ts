import { Component, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { environment } from '../../../../environments/environment';
import { SchoolClass } from '../../../core/models/class.model';

export interface AddEnrollmentDialogData {
  studentId: number;
  classes: SchoolClass[];
}

/** Issue #66 Phase 2A. A dedicated, explicit "Add Class" action -- never the general profile-edit form (Phase 1 boundary). classes is already the Active-only list (Issue #67's default GET /school/classes filter already excludes archived). */
@Component({
  selector: 'app-add-enrollment-dialog',
  standalone: true,
  imports: [FormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatSelectModule],
  template: `
    <h2 mat-dialog-title>Add Class</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" style="width:100%">
        <mat-label>Class</mat-label>
        <mat-select [(ngModel)]="classId" cdkFocusInitial>
          @for (c of data.classes; track c.id) {
            <mat-option [value]="c.id">{{ c.batchName }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      @if (error()) { <p class="error">{{ error() }}</p> }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button color="primary" [disabled]="!classId || submitting()" (click)="submit()">Add</button>
    </mat-dialog-actions>
  `,
  styles: [`.error { color: #b91c1c; font-size: 0.85rem; }`]
})
export class AddEnrollmentDialog {
  private http = inject(HttpClient);
  ref = inject(MatDialogRef<AddEnrollmentDialog, boolean>);
  data: AddEnrollmentDialogData = inject(MAT_DIALOG_DATA);

  classId: number | null = null;
  submitting = signal(false);
  error = signal<string | null>(null);
  private readonly idempotencyKey = crypto.randomUUID();

  submit() {
    if (this.classId == null) return;
    this.submitting.set(true);
    this.error.set(null);
    this.http.post(`${environment.apiUrl}/school/v2/students/${this.data.studentId}/enrollments`, {
      classId: this.classId, idempotencyKey: this.idempotencyKey
    }).subscribe({
      next: () => this.ref.close(true),
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        this.error.set(err.error?.message || 'Could not add this class.');
      }
    });
  }
}
