import { Component, inject } from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { A11yModule } from '@angular/cdk/a11y';

/**
 * Part I.6/Part II.5: opening any assignment card must show this dialog,
 * never an answering UI. Names both later slices explicitly (correction 3
 * of the Slice 10 correction report: "the 'Slice 13's territory' dialog
 * now also names Slice 14"). Uses Foundation component 13 (dialog + focus
 * trap) via MatDialogModule, which already implements the same
 * open-focused/Tab-trapped/Escape-closes-and-returns-focus contract the
 * v1.1.2 reverification reconfirmed for this exact dialog with no
 * regression.
 */
@Component({
  selector: 'app-assignment-info-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, A11yModule],
  template: `
    <h2 mat-dialog-title>Not yet available</h2>
    <mat-dialog-content>
      <p>Answering and submitting assignments is designed in Slice 13; the assignment data and API behind it belong to Slice 14. This screen only shows status once that work ships.</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-flat-button color="primary" cdkFocusInitial (click)="close()">Close</button>
    </mat-dialog-actions>
  `
})
export class AssignmentInfoDialogComponent {
  private ref = inject(MatDialogRef<AssignmentInfoDialogComponent>);

  close(): void {
    this.ref.close();
  }
}
