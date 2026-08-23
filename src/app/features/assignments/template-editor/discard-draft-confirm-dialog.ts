import { Component, inject } from '@angular/core';
import { A11yModule } from '@angular/cdk/a11y';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

/** discardDraft (DELETE /templates/{id}/draft) takes no body -- no rowVersion involved, so no fresh-read step is needed here (unlike archive/publish/delete-question/delete-option). */
@Component({
  selector: 'app-discard-draft-confirm-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, A11yModule],
  styles: [`button[mat-flat-button], button[mat-stroked-button] { min-height: 44px; }`],
  template: `
    <h2 mat-dialog-title>Discard this draft?</h2>
    <mat-dialog-content>
      <p>Discard the current draft version? All unpublished questions and options in this draft will be permanently removed. The previously published version, if any, is unaffected.</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" cdkFocusInitial (click)="ref.close(false)">Cancel</button>
      <button mat-flat-button color="warn" type="button" (click)="ref.close(true)">Discard Draft</button>
    </mat-dialog-actions>
  `
})
export class DiscardDraftConfirmDialog {
  ref = inject(MatDialogRef<DiscardDraftConfirmDialog, boolean>);
}
