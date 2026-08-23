import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { A11yModule } from '@angular/cdk/a11y';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { AssignmentTemplateApiService } from '../../../core/services/assignment-template-api.service';

export interface PublishAttestationAssignmentData { templateId: number; }
export interface PublishAttestationAssignmentResult { expectedRowVersion: number; }

/**
 * Mirrors curriculum/lessons/publish-attestation-dialog.ts's technical-
 * validation-then-attestation shape, extended for the fresh-rowVersion
 * requirement (Plan v2.1.2 §10): re-fetches GET /templates/{id} on open
 * rather than trusting a rowVersion already sitting in the caller's
 * component state, and shows the not-found state if the template
 * disappeared (e.g. concurrently archived) since the caller last loaded it.
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
        <p>This template is no longer available. Reload the page to see its current state.</p>
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
  private api = inject(AssignmentTemplateApiService);

  loading = signal(true);
  notFound = signal(false);
  private rowVersion: number | null = null;

  ngOnInit() {
    this.api.get(this.data.templateId).subscribe({
      next: t => { this.rowVersion = t.rowVersion; this.loading.set(false); },
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
