import { Component, inject } from '@angular/core';
import { A11yModule } from '@angular/cdk/a11y';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export interface ArchiveConfirmLessonData { title: string; }

/** Slice 7 §1.6: destructive-tier confirmation; no delete action exists anywhere -- archive is the only retirement path. */
@Component({
  selector: 'app-archive-confirm-lesson-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, A11yModule],
  styles: [`button[mat-flat-button], button[mat-stroked-button] { min-height: 44px; }`],
  template: `
    <h2 mat-dialog-title>Archive "{{ data.title }}"?</h2>
    <mat-dialog-content>
      <p>Archive this lesson? Archived lessons become read-only and unavailable for new release. Existing history is retained.</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" cdkFocusInitial (click)="ref.close(false)">Cancel</button>
      <button mat-flat-button color="warn" type="button" (click)="ref.close(true)">Archive</button>
    </mat-dialog-actions>
  `
})
export class ArchiveConfirmLessonDialog {
  ref = inject(MatDialogRef<ArchiveConfirmLessonDialog, boolean>);
  data = inject<ArchiveConfirmLessonData>(MAT_DIALOG_DATA);
}
