import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { A11yModule } from '@angular/cdk/a11y';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { AssignmentTemplateApiService } from '../../../core/services/assignment-template-api.service';

export interface ArchiveTemplateConfirmData { templateId: number; }
export interface ArchiveTemplateConfirmResult { expectedRowVersion: number; }

/**
 * Fresh-rowVersion re-fetch on dialog open (Plan v2.1.2 §10): re-fetches
 * GET /templates/{id} rather than reusing whatever rowVersion the caller's
 * already-rendered list/detail state happens to hold. If the template has
 * disappeared since the caller last loaded it, shows the not-found state
 * instead of a confirm action.
 */
@Component({
  selector: 'app-archive-template-confirm-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, A11yModule],
  styles: [`button[mat-flat-button], button[mat-stroked-button] { min-height: 44px; }`],
  template: `
    <h2 mat-dialog-title>Archive this template?</h2>
    <mat-dialog-content>
      @if (loading()) {
        <p>Checking current status…</p>
      } @else if (notFound()) {
        <p>This template is no longer available. Reload the page to see its current state.</p>
      } @else {
        <p>Archive this template? Archived templates become read-only and cannot be assigned to new classes. Existing assigned instances are unaffected.</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" cdkFocusInitial (click)="ref.close(null)">Cancel</button>
      <button mat-flat-button color="warn" type="button" [disabled]="loading() || notFound()" (click)="confirm()">Archive</button>
    </mat-dialog-actions>
  `
})
export class ArchiveTemplateConfirmDialog implements OnInit {
  ref = inject(MatDialogRef<ArchiveTemplateConfirmDialog, ArchiveTemplateConfirmResult | null>);
  data = inject<ArchiveTemplateConfirmData>(MAT_DIALOG_DATA);
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
