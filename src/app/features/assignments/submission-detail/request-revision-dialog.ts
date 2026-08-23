import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { A11yModule } from '@angular/cdk/a11y';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { StaffSubmissionQuestionSnapshotDTO } from '../data-access/assignment-staff.model';

export interface RequestRevisionDialogData { questions: StaffSubmissionQuestionSnapshotDTO[]; }
export interface RequestRevisionDialogResult { flaggedQuestionIds: number[]; feedback: string; }

/** T16 -- feedback is attempt-level only (one field); flags are per-question. */
@Component({
  selector: 'app-request-revision-dialog',
  standalone: true,
  imports: [FormsModule, MatDialogModule, MatButtonModule, MatCheckboxModule, MatFormFieldModule, MatInputModule, A11yModule],
  styles: [`button[mat-flat-button], button[mat-stroked-button] { min-height: 44px; }`],
  template: `
    <h2 mat-dialog-title>Request revision</h2>
    <mat-dialog-content>
      <p>Flag the question(s) that need another attempt:</p>
      @for (q of data.questions; track q.questionId) {
        <mat-checkbox [(ngModel)]="checked[q.questionId]">{{ q.prompt }}</mat-checkbox><br />
      }
      <mat-form-field appearance="outline" style="width:100%;margin-top:12px">
        <mat-label>Feedback</mat-label>
        <textarea matInput rows="3" [(ngModel)]="feedback" cdkFocusInitial></textarea>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="ref.close(null)">Cancel</button>
      <button mat-flat-button color="primary" type="button" [disabled]="!feedback.trim() || flaggedIds().length === 0" (click)="submit()">
        Request Revision
      </button>
    </mat-dialog-actions>
  `
})
export class RequestRevisionDialog {
  ref = inject(MatDialogRef<RequestRevisionDialog, RequestRevisionDialogResult | null>);
  data = inject<RequestRevisionDialogData>(MAT_DIALOG_DATA);

  checked: Record<number, boolean> = {};
  feedback = '';

  flaggedIds(): number[] {
    return Object.entries(this.checked).filter(([, v]) => v).map(([k]) => Number(k));
  }

  submit() {
    this.ref.close({ flaggedQuestionIds: this.flaggedIds(), feedback: this.feedback.trim() });
  }
}
