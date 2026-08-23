import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Observable, of, tap, shareReplay, map } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AssignmentTemplateApiService } from '../../../core/services/assignment-template-api.service';
import { AssignmentAuthoringApiService } from '../data-access/assignment-authoring-api.service';
import { AssignmentTemplateDTO, AssignmentInstanceDTO } from '../../../core/models/assignment.model';
import { AssignmentTemplateVersionDTO } from '../data-access/assignment-staff.model';
import { AssignmentUiError, toAssignmentUiError } from '../../../core/services/assignment-api-error.util';
import { ClassroomLiteModeService } from '../../../core/services/classroom-lite-mode.service';
import { StatusChipAssignmentComponent, AssignmentChipState } from '../../../shared/assignment/status-chip-assignment';
import { AssignmentModeBannerComponent } from '../../../shared/assignment/assignment-mode-banner';
import { AssignmentMessageComponent } from '../../../shared/assignment/assignment-message';
import { FullOutageBlockComponent } from '../../../shared/curriculum/full-outage-block';
import { QuestionList } from './question-list';
import { TemplatePreviewComponent } from './template-preview';
import { validateForPublish } from './assignment-publish-validation.util';
import { DiscardDraftConfirmDialog } from './discard-draft-confirm-dialog';
import { ArchiveTemplateConfirmDialog, ArchiveTemplateConfirmResult } from './archive-template-confirm-dialog';
import { PublishAttestationAssignmentDialog, PublishAttestationAssignmentResult } from './publish-attestation-assignment-dialog';
import { AssignToClassDialog, AssignToClassDialogData } from '../assign-dialog/assign-to-class-dialog';
import { EnsureDraftOutcome } from './ensure-draft-outcome.model';

/**
 * T2/T3/T7/T8 shell -- create+draft/auto-draft/preview/publish. Imports BOTH
 * the core template-lifecycle service (7 endpoints) AND the feature-scoped
 * authoring service (11 endpoints) -- normal features -> core composition,
 * not a boundary violation (Plan v2.1.2 §8.2).
 *
 * T3 auto-draft-on-edit: ensureDraftVersion() is passed down to
 * question-list/option-list as `ensureDraft`; every mutating action in
 * either child calls it first and resolves its actual target from the
 * returned EnsureDraftOutcome (see that type's doc comment) rather than
 * from a captured pre-clone object. If the template already has an open
 * DRAFT, it resolves immediately with no network call. If not, it calls
 * startDraft() exactly once (concurrent callers share the same in-flight
 * Observable via shareReplay(1), so rapid double-clicks never issue
 * duplicate draft calls). The explicit "Start Draft" button (T2) is a
 * separate, still-available manual action -- it does not substitute for
 * this, it is simply another way to reach the same state.
 */
@Component({
  selector: 'app-template-editor',
  standalone: true,
  imports: [
    FormsModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatButtonToggleModule, MatSnackBarModule,
    StatusChipAssignmentComponent, AssignmentModeBannerComponent, AssignmentMessageComponent, FullOutageBlockComponent,
    QuestionList, TemplatePreviewComponent
  ],
  styles: [`
    .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
    .actions { display: flex; gap: 8px; margin: 16px 0; flex-wrap: wrap; }
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

    @if (mode.mode() === 'FULL_OUTAGE') {
      <app-full-outage-block />
    } @else {
      <app-assignment-mode-banner />

      @if (loading()) {
        <p class="empty">Loading…</p>
      } @else if (loadError()) {
        <app-assignment-message [error]="loadError()" (reload)="load()" (retry)="load()" />
      } @else if (template(); as t) {
        <app-assignment-message [error]="actionError()" (reload)="load()" (retry)="load()" />

        <div class="actions">
          @if (!t.draftVersionId) {
            <button mat-stroked-button type="button" [disabled]="mode.mutationsDisabled()" (click)="startDraft()">
              <mat-icon>edit</mat-icon> Start Draft
            </button>
          }
          @if (t.draftVersionId) {
            <button mat-stroked-button color="warn" type="button" [disabled]="mode.mutationsDisabled()" (click)="discardDraft()">Discard Draft</button>
            <button mat-flat-button color="primary" type="button" [disabled]="mode.mutationsDisabled() || !version()" (click)="publish()">
              <mat-icon>check_circle</mat-icon> Publish
            </button>
          }
          @if (t.publishedVersionId && !t.archivedAt) {
            <button mat-stroked-button color="warn" type="button" [disabled]="mode.mutationsDisabled()" (click)="archive()">
              <mat-icon>archive</mat-icon> Archive
            </button>
            <button mat-flat-button color="primary" type="button" [disabled]="mode.mutationsDisabled()" (click)="assignToClass()">
              <mat-icon>send</mat-icon> Assign to Class
            </button>
          }
        </div>

        @if (version(); as v) {
          <mat-form-field appearance="outline" style="max-width:480px;width:100%">
            <mat-label>Title</mat-label>
            <input matInput [(ngModel)]="titleDraft" [disabled]="mode.mutationsDisabled() || !t.draftVersionId" (blur)="saveTitle()" />
          </mat-form-field>

          <mat-button-toggle-group [value]="viewMode()" (change)="viewMode.set($event.value)" style="margin:12px 0">
            <mat-button-toggle value="edit">Edit</mat-button-toggle>
            <mat-button-toggle value="preview">Preview</mat-button-toggle>
          </mat-button-toggle-group>

          @if (viewMode() === 'preview') {
            <app-template-preview [questions]="v.questions" />
          } @else {
            <app-question-list
              [versionId]="v.id" [initialQuestions]="v.questions"
              [editable]="!t.archivedAt" [mutationsDisabled]="mode.mutationsDisabled()"
              [ensureDraft]="ensureDraftVersionRef" (reload)="load()" />
          }
        } @else {
          <p class="empty">No version to display yet -- start a draft or add a question to begin authoring.</p>
        }
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
  mode = inject(ClassroomLiteModeService);

  templateId = signal<number | null>(null);
  template = signal<AssignmentTemplateDTO | null>(null);
  version = signal<AssignmentTemplateVersionDTO | null>(null);
  loading = signal(true);
  loadError = signal<AssignmentUiError | null>(null);
  actionError = signal<AssignmentUiError | null>(null);
  viewMode = signal<'edit' | 'preview'>('edit');
  titleDraft = '';

  private draftCreation$: Observable<AssignmentTemplateVersionDTO> | null = null;

  /** Bound once (arrow function, stable reference) so question-list's ngOnChanges is never re-triggered by a new function identity on each render. */
  ensureDraftVersionRef = (): Observable<EnsureDraftOutcome> => this.ensureDraftVersion();

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

  /** T3 auto-draft-on-edit: resolves to the current open draft, creating one (once, de-duplicated) if none exists yet. See EnsureDraftOutcome's doc comment for why callers must branch on `freshlyCreated`. */
  private ensureDraftVersion(): Observable<EnsureDraftOutcome> {
    const t = this.template();
    const v = this.version();
    if (t?.draftVersionId && v?.status === 'DRAFT') {
      return of({ version: v, freshlyCreated: false });
    }
    if (!this.draftCreation$) {
      const id = this.templateId();
      if (id == null) return of({ version: v!, freshlyCreated: false });
      this.draftCreation$ = this.authoringApi.startDraft(id).pipe(
        tap(newDraft => {
          this.version.set(newDraft);
          this.titleDraft = newDraft.title;
          this.template.update(tt => tt ? { ...tt, draftVersionId: newDraft.id, displayStatus: tt.publishedVersionId ? 'PUBLISHED_WITH_DRAFT' : 'DRAFT' } : tt);
          this.draftCreation$ = null;
        }),
        shareReplay(1)
      );
    }
    return this.draftCreation$.pipe(map(newDraft => ({ version: newDraft, freshlyCreated: true })));
  }

  saveTitle() {
    const v = this.version();
    if (!v) return;
    const trimmed = this.titleDraft.trim();
    if (!trimmed || trimmed === v.title) return;
    this.ensureDraftVersion().subscribe({
      next: ({ version: current }) => {
        this.authoringApi.updateTitle(current.id, { expectedRowVersion: current.rowVersion, title: trimmed }).subscribe({
          next: updated => this.version.set(updated),
          error: (err: HttpErrorResponse) => this.actionError.set(toAssignmentUiError(err))
        });
      },
      error: (err: HttpErrorResponse) => this.actionError.set(toAssignmentUiError(err))
    });
  }

  startDraft() {
    this.ensureDraftVersion().subscribe({
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

  /**
   * T8/real technical publish gate (correction pass item 3): validates the
   * freshly-held draft graph against the exact same rules
   * AssignmentTemplateService.validateAnswerKey() enforces server-side,
   * BEFORE ever opening the attestation dialog. The attestation dialog
   * remains a separate human-confirmation step reached only once this
   * technical validation passes.
   */
  publish() {
    const id = this.templateId();
    const v = this.version();
    if (id == null || v == null) return;
    const validationError = validateForPublish(v.questions);
    if (validationError) {
      this.actionError.set(validationError);
      return;
    }
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
