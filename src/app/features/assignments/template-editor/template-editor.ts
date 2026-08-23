import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AssignmentTemplateApiService } from '../../../core/services/assignment-template-api.service';
import { AssignmentAuthoringApiService } from '../data-access/assignment-authoring-api.service';
import { AssignmentTemplateDTO } from '../../../core/models/assignment.model';
import { AssignmentTemplateVersionDTO } from '../data-access/assignment-staff.model';
import { AssignmentUiError, toAssignmentUiError } from '../../../core/services/assignment-api-error.util';
import { StatusChipAssignmentComponent, AssignmentChipState } from '../../../shared/assignment/status-chip-assignment';
import { QuestionList } from './question-list';
import { DiscardDraftConfirmDialog } from './discard-draft-confirm-dialog';
import { ArchiveTemplateConfirmDialog, ArchiveTemplateConfirmResult } from './archive-template-confirm-dialog';
import { PublishAttestationAssignmentDialog, PublishAttestationAssignmentResult } from './publish-attestation-assignment-dialog';
import { AssignToClassDialog, AssignToClassDialogData } from '../assign-dialog/assign-to-class-dialog';
import { AssignmentInstanceDTO } from '../../../core/models/assignment.model';

/**
 * T2/T3/T7/T8 shell -- create+draft/auto-draft/preview/publish. Imports BOTH
 * the core template-lifecycle service (7 endpoints: get/publish/archive/
 * discardDraft) AND the feature-scoped authoring service (11 endpoints:
 * startDraft/getVersion/question+option CRUD/reorder) -- normal
 * features -> core composition, not a boundary violation (Plan v2.1.2 §8.2).
 */
@Component({
  selector: 'app-template-editor',
  standalone: true,
  imports: [
    FormsModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSnackBarModule,
    StatusChipAssignmentComponent, QuestionList
  ],
  styles: [`
    .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
    .actions { display: flex; gap: 8px; margin: 16px 0; }
    .error { color: #b91c1c; padding: 8px 0; }
    .empty { color: #adb5bd; padding: 32px 0; }
    button[mat-flat-button], button[mat-stroked-button] { min-height: 44px; }
  `],
  template: `
    <div class="page-header">
      <div style="display:flex;align-items:center;gap:6px">
        <button mat-icon-button (click)="close()" aria-label="Back to templates"><mat-icon>arrow_back</mat-icon></button>
        <h2 style="margin:0">Template</h2>
      </div>
      @if (template(); as t) { <app-status-chip-assignment [state]="chipState(t)" /> }
    </div>

    @if (loading()) {
      <p class="empty">Loading…</p>
    } @else if (loadError()) {
      <p class="error">{{ loadError()!.message }} <button mat-stroked-button (click)="load()">Reload</button></p>
    } @else if (template(); as t) {
      @if (actionError()) { <p class="error">{{ actionError()!.message }}</p> }

      <div class="actions">
        @if (!t.draftVersionId) {
          <button mat-stroked-button type="button" (click)="startDraft()">
            <mat-icon>edit</mat-icon> Start Draft
          </button>
        }
        @if (t.draftVersionId) {
          <button mat-stroked-button color="warn" type="button" (click)="discardDraft()">Discard Draft</button>
          <button mat-flat-button color="primary" type="button" [disabled]="!version() || version()!.questions.length === 0" (click)="publish()">
            <mat-icon>check_circle</mat-icon> Publish
          </button>
        }
        @if (t.publishedVersionId && !t.archivedAt) {
          <button mat-stroked-button color="warn" type="button" (click)="archive()">
            <mat-icon>archive</mat-icon> Archive
          </button>
          <button mat-flat-button color="primary" type="button" (click)="assignToClass()">
            <mat-icon>send</mat-icon> Assign to Class
          </button>
        }
      </div>

      @if (version(); as v) {
        <mat-form-field appearance="outline" style="max-width:480px;width:100%">
          <mat-label>Title</mat-label>
          <input matInput [(ngModel)]="titleDraft" [disabled]="v.status !== 'DRAFT'" (blur)="saveTitle(v)" />
        </mat-form-field>

        <app-question-list [versionId]="v.id" [initialQuestions]="v.questions" [draft]="v.status === 'DRAFT'" />
      } @else {
        <p class="empty">No version to display yet -- start a draft to begin authoring.</p>
      }
    }
  `
})
export class TemplateEditorComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private templateApi = inject(AssignmentTemplateApiService);
  private authoringApi = inject(AssignmentAuthoringApiService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  templateId = signal<number | null>(null);
  template = signal<AssignmentTemplateDTO | null>(null);
  version = signal<AssignmentTemplateVersionDTO | null>(null);
  loading = signal(true);
  loadError = signal<AssignmentUiError | null>(null);
  actionError = signal<AssignmentUiError | null>(null);
  titleDraft = '';

  ngOnInit() {
    this.templateId.set(Number(this.route.snapshot.paramMap.get('templateId')));
    this.load();
  }

  chipState(t: AssignmentTemplateDTO): AssignmentChipState {
    return t.displayStatus as AssignmentChipState;
  }

  load() {
    const id = this.templateId();
    if (id == null) return;
    this.loading.set(true);
    this.loadError.set(null);
    this.actionError.set(null);
    this.templateApi.get(id).subscribe({
      next: t => {
        this.template.set(t);
        const versionId = t.draftVersionId ?? t.publishedVersionId;
        if (versionId == null) { this.version.set(null); this.loading.set(false); return; }
        this.authoringApi.getVersion(versionId).subscribe({
          next: v => { this.version.set(v); this.titleDraft = v.title; this.loading.set(false); },
          error: (err: HttpErrorResponse) => { this.loadError.set(toAssignmentUiError(err)); this.loading.set(false); }
        });
      },
      error: (err: HttpErrorResponse) => { this.loadError.set(toAssignmentUiError(err)); this.loading.set(false); }
    });
  }

  saveTitle(v: AssignmentTemplateVersionDTO) {
    const trimmed = this.titleDraft.trim();
    if (!trimmed || trimmed === v.title) return;
    this.authoringApi.updateTitle(v.id, { expectedRowVersion: v.rowVersion, title: trimmed }).subscribe({
      next: updated => this.version.set(updated),
      error: (err: HttpErrorResponse) => this.actionError.set(toAssignmentUiError(err))
    });
  }

  startDraft() {
    const id = this.templateId();
    if (id == null) return;
    this.authoringApi.startDraft(id).subscribe({
      next: () => this.load(),
      error: (err: HttpErrorResponse) => this.actionError.set(toAssignmentUiError(err))
    });
  }

  discardDraft() {
    const id = this.templateId();
    if (id == null) return;
    const ref = this.dialog.open<DiscardDraftConfirmDialog, unknown, boolean>(DiscardDraftConfirmDialog);
    ref.afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.templateApi.discardDraft(id).subscribe({
        next: () => { this.snack.open('Draft discarded', 'OK', { duration: 2000 }); this.load(); },
        error: (err: HttpErrorResponse) => this.actionError.set(toAssignmentUiError(err))
      });
    });
  }

  publish() {
    const id = this.templateId();
    if (id == null) return;
    const ref = this.dialog.open<PublishAttestationAssignmentDialog, unknown, PublishAttestationAssignmentResult | null>(
      PublishAttestationAssignmentDialog, { data: { templateId: id } }
    );
    ref.afterClosed().subscribe(result => {
      if (!result) return;
      this.templateApi.publish(id, { expectedRowVersion: result.expectedRowVersion }).subscribe({
        next: () => { this.snack.open('Published', 'OK', { duration: 2500 }); this.load(); },
        error: (err: HttpErrorResponse) => this.actionError.set(toAssignmentUiError(err))
      });
    });
  }

  archive() {
    const id = this.templateId();
    if (id == null) return;
    const ref = this.dialog.open<ArchiveTemplateConfirmDialog, unknown, ArchiveTemplateConfirmResult | null>(
      ArchiveTemplateConfirmDialog, { data: { templateId: id } }
    );
    ref.afterClosed().subscribe(result => {
      if (!result) return;
      this.templateApi.archive(id, { expectedRowVersion: result.expectedRowVersion }).subscribe({
        next: () => { this.snack.open('Archived', 'OK', { duration: 2500 }); this.load(); },
        error: (err: HttpErrorResponse) => this.actionError.set(toAssignmentUiError(err))
      });
    });
  }

  assignToClass() {
    const id = this.templateId();
    if (id == null) return;
    const ref = this.dialog.open<AssignToClassDialog, AssignToClassDialogData, AssignmentInstanceDTO | null>(
      AssignToClassDialog, { data: { templateId: id } }
    );
    ref.afterClosed().subscribe(instance => {
      if (!instance) return;
      this.snack.open('Assigned', 'OK', { duration: 2500 });
      this.router.navigate(['/vidya-rasa/assignments/instances', instance.id]);
    });
  }

  close() {
    this.router.navigate(['/vidya-rasa/assignments']);
  }
}
