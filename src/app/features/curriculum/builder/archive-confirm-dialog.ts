import { Component, inject } from '@angular/core';
import { A11yModule } from '@angular/cdk/a11y';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export interface ArchiveConfirmData { title: string; }

/**
 * Foundation v1.1 Part IV, item 19 (Confirmation dialog): explicit primary-
 * action click required, consequence stated in plain language, destructive
 * button never default-focused. MatDialog already traps focus and restores
 * it to the trigger on close.
 */
@Component({
  selector: 'app-archive-confirm-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, A11yModule],
  styles: [`button[mat-flat-button], button[mat-stroked-button] { min-height: 44px; }`],
  template: `
    <h2 mat-dialog-title>Archive "{{ data.title }}"?</h2>
    <mat-dialog-content>
      <p>Archived curricula become read-only and can no longer be assigned to new classes. Classes already using this version keep their history — nothing already assigned is affected.</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" cdkFocusInitial (click)="ref.close(false)">Cancel</button>
      <button mat-flat-button color="warn" type="button" (click)="ref.close(true)">Archive</button>
    </mat-dialog-actions>
  `
})
export class ArchiveConfirmDialog {
  ref = inject(MatDialogRef<ArchiveConfirmDialog, boolean>);
  data = inject<ArchiveConfirmData>(MAT_DIALOG_DATA);
}
