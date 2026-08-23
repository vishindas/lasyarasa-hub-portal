import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { A11yModule } from '@angular/cdk/a11y';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { AssignmentAuthoringApiService } from '../data-access/assignment-authoring-api.service';

export interface DeleteQuestionConfirmData { versionId: number; questionId: number; }
export interface DeleteQuestionConfirmResult { expectedRowVersion: number; }

/**
 * Guarded delete's fresh-read step (Plan v2.1.2 §10): re-fetches
 * GET /versions/{versionId} on open -- not the editor's already-rendered
 * state -- and locates the target question by id in the refreshed
 * response, using THAT row's rowVersion. If the question is absent from
 * the refreshed payload (deleted concurrently), closes to the not-found
 * state rather than falling back to a cached rowVersion.
 */
@Component({
  selector: 'app-delete-question-confirm-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, A11yModule],
  styles: [`button[mat-flat-button], button[mat-stroked-button] { min-height: 44px; }`],
  template: `
    <h2 mat-dialog-title>Delete this question?</h2>
    <mat-dialog-content>
      @if (loading()) {
        <p>Checking current status…</p>
      } @else if (notFound()) {
        <p>This question no longer exists. Reload the editor to see its current state.</p>
      } @else {
        <p>Delete this question and all of its options? This cannot be undone.</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" cdkFocusInitial (click)="ref.close(null)">Cancel</button>
      <button mat-flat-button color="warn" type="button" [disabled]="loading() || notFound()" (click)="confirm()">Delete</button>
    </mat-dialog-actions>
  `
})
export class DeleteQuestionConfirmDialog implements OnInit {
  ref = inject(MatDialogRef<DeleteQuestionConfirmDialog, DeleteQuestionConfirmResult | null>);
  data = inject<DeleteQuestionConfirmData>(MAT_DIALOG_DATA);
  private api = inject(AssignmentAuthoringApiService);

  loading = signal(true);
  notFound = signal(false);
  private rowVersion: number | null = null;

  ngOnInit() {
    this.api.getVersion(this.data.versionId).subscribe({
      next: v => {
        const q = v.questions.find(q => q.id === this.data.questionId);
        this.loading.set(false);
        if (q) this.rowVersion = q.rowVersion;
        else this.notFound.set(true);
      },
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
