import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { A11yModule } from '@angular/cdk/a11y';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { AssignmentAuthoringApiService } from '../data-access/assignment-authoring-api.service';

export interface DeleteOptionConfirmData { versionId: number; questionId: number; optionId: number; }
export interface DeleteOptionConfirmResult { expectedRowVersion: number; }

/** Same fresh-read pattern as delete-question-confirm-dialog.ts, at option granularity -- locates the option within the refreshed question's options[]. */
@Component({
  selector: 'app-delete-option-confirm-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, A11yModule],
  styles: [`button[mat-flat-button], button[mat-stroked-button] { min-height: 44px; }`],
  template: `
    <h2 mat-dialog-title>Delete this option?</h2>
    <mat-dialog-content>
      @if (loading()) {
        <p>Checking current status…</p>
      } @else if (notFound()) {
        <p>This option no longer exists. Reload the editor to see its current state.</p>
      } @else {
        <p>Delete this option? This cannot be undone.</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" cdkFocusInitial (click)="ref.close(null)">Cancel</button>
      <button mat-flat-button color="warn" type="button" [disabled]="loading() || notFound()" (click)="confirm()">Delete</button>
    </mat-dialog-actions>
  `
})
export class DeleteOptionConfirmDialog implements OnInit {
  ref = inject(MatDialogRef<DeleteOptionConfirmDialog, DeleteOptionConfirmResult | null>);
  data = inject<DeleteOptionConfirmData>(MAT_DIALOG_DATA);
  private api = inject(AssignmentAuthoringApiService);

  loading = signal(true);
  notFound = signal(false);
  private rowVersion: number | null = null;

  ngOnInit() {
    this.api.getVersion(this.data.versionId).subscribe({
      next: v => {
        const q = v.questions.find(q => q.id === this.data.questionId);
        const o = q?.options.find(o => o.id === this.data.optionId);
        this.loading.set(false);
        if (o) this.rowVersion = o.rowVersion;
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
