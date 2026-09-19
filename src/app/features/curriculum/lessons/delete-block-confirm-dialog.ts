import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { A11yModule } from '@angular/cdk/a11y';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { LessonApiService } from '../../../core/services/lesson-api.service';
import { LessonContentBlockApiService } from '../../../core/services/lesson-content-block-api.service';

export interface DeleteBlockConfirmData { moduleId: number; lessonId: number; blockId: number; contentTypeLabel: string; }
export interface DeleteBlockConfirmResult { expectedLessonRowVersion: number; }

/**
 * MC-3 architect correction: guarded delete, mirroring
 * DeleteQuestionConfirmDialog's own fresh-read pattern one level down
 * (same rationale, same shape) -- not the plain confirmation this dialog
 * started as. On open, re-fetches the lesson (for its current, real
 * rowVersion -- blocks carry none of their own, so the parent lesson's is
 * what guards a block delete) and the block list (to confirm the target
 * block still exists) fresh, rather than trusting the caller's
 * already-rendered, possibly-stale state. If either the lesson or the
 * block is missing from that fresh read (deleted or the lesson itself
 * removed concurrently), this closes to a "no longer exists" state
 * instead of falling back to a cached rowVersion. Row-version enforcement
 * on the server already prevents any UNSAFE concurrent deletion regardless
 * of this dialog's own behavior -- this is the same honest, no-worse-than-
 * necessary UX guarantee the question-delete flow already gives, applied
 * consistently one level down.
 */
@Component({
  selector: 'app-delete-block-confirm-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, A11yModule],
  styles: [`button[mat-flat-button], button[mat-stroked-button] { min-height: 44px; }`],
  template: `
    <h2 mat-dialog-title>Remove this {{ data.contentTypeLabel }} block?</h2>
    <mat-dialog-content>
      @if (loading()) {
        <p>Checking current status…</p>
      } @else if (notFound()) {
        <p>This block (or its lesson) no longer exists. Reload the editor to see its current state.</p>
      } @else {
        <p>This block will be permanently removed from the lesson. This cannot be undone.</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" cdkFocusInitial (click)="ref.close(null)">Cancel</button>
      <button mat-flat-button color="warn" type="button" [disabled]="loading() || notFound()" (click)="confirm()">Remove</button>
    </mat-dialog-actions>
  `
})
export class DeleteBlockConfirmDialog implements OnInit {
  ref = inject(MatDialogRef<DeleteBlockConfirmDialog, DeleteBlockConfirmResult | null>);
  data = inject<DeleteBlockConfirmData>(MAT_DIALOG_DATA);
  private lessonApi = inject(LessonApiService);
  private blockApi = inject(LessonContentBlockApiService);

  loading = signal(true);
  notFound = signal(false);
  private freshLessonRowVersion: number | null = null;

  ngOnInit() {
    forkJoin({
      lessons: this.lessonApi.list(this.data.moduleId),
      blocks: this.blockApi.list(this.data.lessonId)
    }).subscribe({
      next: ({ lessons, blocks }) => {
        this.loading.set(false);
        const lesson = lessons.find(l => l.id === this.data.lessonId);
        const block = blocks.find(b => b.id === this.data.blockId);
        if (!lesson || !block) { this.notFound.set(true); return; }
        this.freshLessonRowVersion = lesson.rowVersion;
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.notFound.set(err.status === 404 || err.error?.code === 'RESOURCE_NOT_FOUND');
      }
    });
  }

  confirm() {
    if (this.freshLessonRowVersion == null) return;
    this.ref.close({ expectedLessonRowVersion: this.freshLessonRowVersion });
  }
}
