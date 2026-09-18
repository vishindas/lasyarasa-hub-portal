import { Component, inject } from '@angular/core';
import { A11yModule } from '@angular/cdk/a11y';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export interface DeleteBlockConfirmData { contentTypeLabel: string; }

/** MC-3: unlike a Lesson (no delete endpoint exists at all), removing a content block is a real, expected authoring operation -- mirrors ArchiveConfirmLessonDialog's own destructive-tier confirmation pattern one level down. */
@Component({
  selector: 'app-delete-block-confirm-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, A11yModule],
  styles: [`button[mat-flat-button], button[mat-stroked-button] { min-height: 44px; }`],
  template: `
    <h2 mat-dialog-title>Remove this {{ data.contentTypeLabel }} block?</h2>
    <mat-dialog-content>
      <p>This block will be permanently removed from the lesson. This cannot be undone.</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" cdkFocusInitial (click)="ref.close(false)">Cancel</button>
      <button mat-flat-button color="warn" type="button" (click)="ref.close(true)">Remove</button>
    </mat-dialog-actions>
  `
})
export class DeleteBlockConfirmDialog {
  ref = inject(MatDialogRef<DeleteBlockConfirmDialog, boolean>);
  data = inject<DeleteBlockConfirmData>(MAT_DIALOG_DATA);
}
