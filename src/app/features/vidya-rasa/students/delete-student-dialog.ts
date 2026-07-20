import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { Student } from '../../../core/models/student.model';

export interface DeleteStudentDialogData { student: Student; }

@Component({
  selector: 'app-delete-student-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Delete Student</h2>
    <mat-dialog-content>
      <p style="margin:0;font-size:0.95rem;line-height:1.5">
        Delete <strong>{{ data.student.firstName }} {{ data.student.lastName }}</strong>?
        This cannot be undone.
      </p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button color="warn" (click)="ref.close(true)">Delete</button>
    </mat-dialog-actions>
  `
})
export class DeleteStudentDialog {
  ref = inject(MatDialogRef<DeleteStudentDialog>);
  data = inject<DeleteStudentDialogData>(MAT_DIALOG_DATA);
}
