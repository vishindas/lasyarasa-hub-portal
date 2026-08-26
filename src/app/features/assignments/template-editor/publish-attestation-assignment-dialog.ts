import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { A11yModule } from '@angular/cdk/a11y';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { AssignmentAuthoringApiService } from '../data-access/assignment-authoring-api.service';

export interface PublishAttestationAssignmentData { templateId: number; versionId: number; }
export interface PublishAttestationAssignmentResult { expectedRowVersion: number; }

/**
 * Mirrors curriculum/lessons/publish-attestation-dialog.ts's technical-
 * validation-then-attestation shape, extended for the fresh-rowVersion
 * requirement (Plan v2.1.2 §10): re-fetches GET /versions/{versionId} on
 * open rather than trusting a rowVersion already sitting in the caller's
 * component state, and shows the not-found state if the draft version
 * disappeared (e.g. concurrently published/archived) since the caller last
 * loaded it.
 *
 * Bug fix (production pilot, template 4/Dev Dance School): this used to
 * fetch GET /templates/{templateId} and read the TEMPLATE's rowVersion.
 * The backend's publish() checks the DRAFT VERSION's rowVersion
 * (AssignmentTemplateService.publish -> draft.getRowVersion()), which is a
 * separate counter that increments on question/option edits while the
 * template's own rowVersion does not. Sending the template's rowVersion is
 * a permanent mismatch, not a transient staleness -- publish would fail
 * forever, and no amount of reloading could fix it, since Reload only
 * refreshed the caller's state, never the value this dialog independently
 * fetches and sends.
 */
@Component({
  selector: 'app-publish-attestation-assignment-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, A11yModule],
  styles: [`button[mat-flat-button], button[mat-stroked-button] { min-height: 44px; }`],
  template: `
    <h2 mat-dialog-title>Publish this template?</h2>
    <mat-dialog-content>
      @if (loading()) {
        <p>Checking current status…</p>
      } @else if (notFound()) {
        <p>This draft is no longer available. Reload the page to see its current state.</p>
      } @else {
        <p>Publish this draft? It becomes the active version for any class this template's module is assigned to. Any previously published version is archived automatically.</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" cdkFocusInitial (click)="ref.close(null)">Cancel</button>
      <button mat-flat-button color="primary" type="button" [disabled]="loading() || notFound()" (click)="confirm()">Publish</button>
    </mat-dialog-actions>
  `
})
export class PublishAttestationAssignmentDialog implements OnInit {
  ref = inject(MatDialogRef<PublishAttestationAssignmentDialog, PublishAttestationAssignmentResult | null>);
  data = inject<PublishAttestationAssignmentData>(MAT_DIALOG_DATA);
  private api = inject(AssignmentAuthoringApiService);

  loading = signal(true);
  notFound = signal(false);
  private rowVersion: number | null = null;

  ngOnInit() {
    this.api.getVersion(this.data.versionId).subscribe({
      next: v => { this.rowVersion = v.rowVersion; this.loading.set(false); },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.notFound.set(err.status === 404 || err.error?.code === 'RESOURCE_NOT_FOUND');
      }
    });
  }

  confirm() {
    if (this.rowVersion == null) return;
    this.ref.close({ expectedRowVersion: this.rowVersion });
  }
}
