import { Component, inject } from '@angular/core';
import { A11yModule } from '@angular/cdk/a11y';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export interface UnpublishConfirmLessonData { title: string; }

/** Slice 7 §1.6: confirmation states the exact consequence -- new student access is removed immediately, history stays resolvable. */
@Component({
  selector: 'app-unpublish-confirm-lesson-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, A11yModule],
  styles: [`button[mat-flat-button], button[mat-stroked-button] { min-height: 44px; }`],
  template: `
    <h2 mat-dialog-title>Unpublish "{{ data.title }}"?</h2>
    <mat-dialog-content>
      <p>Unpublish this lesson? New student access is removed immediately. Existing assignment and submission history stays resolvable.</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" cdkFocusInitial (click)="ref.close(false)">Cancel</button>
      <button mat-flat-button color="warn" type="button" (click)="ref.close(true)">Unpublish</button>
    </mat-dialog-actions>
  `
})
export class UnpublishConfirmLessonDialog {
  ref = inject(MatDialogRef<UnpublishConfirmLessonDialog, boolean>);
  data = inject<UnpublishConfirmLessonData>(MAT_DIALOG_DATA);
}
