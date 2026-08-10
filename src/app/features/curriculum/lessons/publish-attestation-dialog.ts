import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { A11yModule } from '@angular/cdk/a11y';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';

export interface PublishAttestationDialogData {
  mode: 'publish' | 'republish';
  isVideo: boolean;
}

export interface PublishAttestationDialogResult {
  attested: boolean;
}

/**
 * Figure 4 (Publish & Attestation). One dialog for both Publish and
 * Republish Video (Slice 7 §6.3: "immediately before Publish, every time --
 * including when Repair/Replace Video supplies a new video for an
 * already-published lesson") -- identical attestation-checkbox gating,
 * differing only in confirmation copy and which parent action the caller
 * takes on confirm. Exactly the noIdentifiableStudentPresent statement, no
 * paraphrase (§6.3): attestedBy/attestedAt are never collected here --
 * server-derived only, per PublishLessonRequest/RepairLessonVideoRequest
 * carrying no such fields.
 */
@Component({
  selector: 'app-publish-attestation-dialog',
  standalone: true,
  imports: [FormsModule, MatDialogModule, MatButtonModule, MatCheckboxModule, A11yModule],
  styles: [`button[mat-flat-button], button[mat-stroked-button] { min-height: 44px; }`],
  template: `
    <h2 mat-dialog-title>{{ data.mode === 'publish' ? 'Publish this lesson?' : "Republish this lesson's video?" }}</h2>
    <mat-dialog-content>
      <p>{{ consequenceCopy() }}</p>
      @if (data.isVideo) {
        <mat-checkbox [(ngModel)]="attested">
          I confirm no identifiable student is visible or audible in this recording.
        </mat-checkbox>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" cdkFocusInitial (click)="ref.close(null)">Cancel</button>
      <button mat-flat-button color="primary" type="button" [disabled]="data.isVideo && !attested" (click)="confirm()">
        {{ data.mode === 'publish' ? 'Publish' : 'Republish Video' }}
      </button>
    </mat-dialog-actions>
  `
})
export class PublishAttestationDialog {
  ref = inject(MatDialogRef<PublishAttestationDialog, PublishAttestationDialogResult | null>);
  data = inject<PublishAttestationDialogData>(MAT_DIALOG_DATA);

  attested = false;

  consequenceCopy(): string {
    return this.data.mode === 'publish'
      ? 'Publish this lesson? Students in released modules will be able to view it.'
      : "Republish this lesson's video? Students will be able to play it again. The lesson stays published throughout.";
  }

  confirm() {
    this.ref.close({ attested: this.data.isVideo ? this.attested : true });
  }
}
