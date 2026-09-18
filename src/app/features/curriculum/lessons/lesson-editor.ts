import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { LowerCasePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import {
  Lesson, CurriculumVersion, CurriculumModule, CreateLessonRequest, UpdateLessonRequest
} from '../../../core/models/curriculum.model';
import { LessonApiService } from '../../../core/services/lesson-api.service';
import { CurriculumApiService } from '../../../core/services/curriculum-api.service';
import { CurriculumModuleApiService } from '../../../core/services/curriculum-module-api.service';
import { ClassroomLiteModeService } from '../../../core/services/classroom-lite-mode.service';
import { CurriculumUiError, toCurriculumUiError } from '../../../core/services/curriculum-api-error.util';
import { ClassroomLiteBannerComponent } from '../../../shared/curriculum/classroom-lite-banner';
import { CurriculumMessageComponent } from '../../../shared/curriculum/curriculum-message';
import { FullOutageBlockComponent } from '../../../shared/curriculum/full-outage-block';
import { YouTubeUrlValidatorComponent, YouTubeValidatedEvent } from './youtube-url-validator';
import { PublishAttestationDialog, PublishAttestationDialogData, PublishAttestationDialogResult } from './publish-attestation-dialog';
import { UnpublishConfirmLessonDialog } from './unpublish-confirm-lesson-dialog';
import { ArchiveConfirmLessonDialog } from './archive-confirm-lesson-dialog';
import { LessonBlockListComponent } from './lesson-block-list';

/**
 * Figure 2 (Lesson Editor), create and edit in one component (route-param
 * mode, matching CurriculumBuilderComponent's own create/edit dual-mode
 * pattern). No single-lesson GET endpoint exists -- edit mode loads via the
 * existing list-by-module endpoint and selects the routed :lessonId,
 * exactly the same data-composition rule ModuleDetailPanelComponent
 * already uses.
 *
 * MC-3 clean-slate architecture: metadata-only (title + practice notes).
 * The old content-type toggle and per-type content form are gone entirely
 * -- CreateLessonRequest/UpdateLessonRequest no longer carry content
 * fields at all; a lesson's actual content is now zero or more
 * lesson_content_blocks, authored below via LessonBlockListComponent
 * (block-native, no 0-vs->=1-block branching -- architect decision 5).
 * The block list only applies in edit mode (a block needs a real lessonId
 * + lesson rowVersion to guard against); a brand-new lesson must be saved
 * once as metadata first, exactly like the old flow required a first save
 * before any lifecycle action.
 *
 * A pre-MC-3 legacy lesson (contentType still non-null) keeps its frozen
 * single-content fields entirely read-only here -- no editing UI for them
 * exists any more (the deliberate "no legacy-content echo workaround"
 * fix: the fields were removed from the DTOs, not kept-and-blanked). Its
 * one remaining legacy-specific affordance, Repair/Republish Video, stays
 * lesson-level and unchanged, gated strictly on `contentType === 'VIDEO'`
 * -- a block-native lesson's own VIDEO blocks repair independently, one
 * level down, inside LessonBlockListComponent/LessonBlockRowComponent.
 */
@Component({
  selector: 'app-lesson-editor',
  standalone: true,
  imports: [
    FormsModule, LowerCasePipe, MatButtonModule, MatIconModule, MatCardModule, MatFormFieldModule, MatInputModule,
    MatDialogModule, MatSnackBarModule,
    ClassroomLiteBannerComponent, CurriculumMessageComponent, FullOutageBlockComponent, YouTubeUrlValidatorComponent,
    LessonBlockListComponent
  ],
  styles: [`
    button[mat-flat-button], button[mat-stroked-button], button[mat-button] { min-height: 44px; }
    :host { display: block; }
    .panel { max-width: 720px; display: flex; flex-direction: column; gap: 16px; }
    mat-form-field { width: 100%; }
    .repair-banner {
      display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: 8px;
      background: #fef3c7; color: #92400e; border: 1px solid #fde68a; font-size: 0.85rem;
    }
    .actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
    .readonly-note { color: #6c757d; font-size: 0.82rem; }
  `],
  template: `
    <div class="page-header">
      <div style="display:flex;align-items:center;gap:6px">
        <button mat-icon-button (click)="close()" aria-label="Back to Lessons">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <h2 style="margin:0">{{ isEdit() ? 'Edit Lesson' : 'Add Lesson' }}</h2>
      </div>
    </div>

    @if (mode.mode() === 'FULL_OUTAGE') {
      <app-full-outage-block />
    } @else {
      <app-classroom-lite-banner />

      @if (loading()) {
        <p style="color:#adb5bd;padding:32px 0">Loading…</p>
      } @else if (loadError()) {
        <app-curriculum-message [error]="loadError()" (retry)="load()" (reload)="load()" />
      } @else {
        <div class="panel">
          <app-curriculum-message [error]="actionError()" (reload)="load()" />

          @if (isArchived()) {
            <p class="readonly-note">Archived lesson — this lesson is read-only.</p>
          } @else if (moduleArchived()) {
            <p class="readonly-note">This lesson's module is archived — its content is read-only.</p>
          } @else if (!parentDraft() && needsLegacyRepair()) {
            <p class="readonly-note">The parent curriculum version is no longer DRAFT — structural edits require a new cloned draft. Only video repair remains available for this lesson.</p>
          } @else if (!parentDraft()) {
            <p class="readonly-note">The parent curriculum version is no longer DRAFT — structural edits require a new cloned draft.</p>
          }

          <mat-form-field appearance="outline">
            <mat-label>Title</mat-label>
            <input matInput [(ngModel)]="form.title" maxlength="120" [disabled]="readOnly() || mode.mutationsDisabled() || saving()" />
          </mat-form-field>

          @if (isLegacyLesson()) {
            <p class="readonly-note">
              This lesson was created before the block content editor. Its original {{ lesson()?.contentType | lowercase }} content is preserved
              and shown in Preview, but can no longer be edited here.
            </p>
            @if (needsLegacyRepair()) {
              <div class="repair-banner">
                <mat-icon aria-hidden="true">warning</mat-icon>
                This video is private, removed, restricted, or currently unavailable. Repair or replace the link.
              </div>
              @if (moduleArchived()) {
                <p class="readonly-note">This lesson's module is archived — video repair is read-only.</p>
              }
              <app-youtube-url-validator [disabled]="!moduleConfirmedWritable() || mode.mutationsDisabled() || saving()" (validated)="onRepairValidated($event)" (cleared)="onRepairCleared()" />
              <div class="actions">
                <button mat-flat-button color="primary" type="button" [disabled]="!repairReady() || !moduleConfirmedWritable() || mode.mutationsDisabled() || saving()" (click)="openRepairDialog()">
                  Republish Video
                </button>
              </div>
            }
          }

          <mat-form-field appearance="outline">
            <mat-label>Practice notes (optional)</mat-label>
            <textarea matInput rows="3" [(ngModel)]="form.practiceNotes" placeholder="About this lesson and any practice guidance" [disabled]="readOnly() || mode.mutationsDisabled() || saving()"></textarea>
          </mat-form-field>

          <div class="actions">
            @if (!isEdit()) {
              <button mat-flat-button color="primary" type="button" [disabled]="readOnly() || mode.mutationsDisabled() || saving() || !form.title.trim()" (click)="save()">
                Save as Draft
              </button>
            } @else {
              @if (!readOnly()) {
                <button mat-stroked-button type="button" [disabled]="mode.mutationsDisabled() || saving() || !form.title.trim()" (click)="save()">Save</button>
              }
              @if (lesson()?.lifecycleStatus === 'DRAFT' && !readOnly()) {
                <button mat-flat-button color="primary" type="button" [disabled]="mode.mutationsDisabled() || saving() || !publishReady()" (click)="openPublishDialog()">
                  <mat-icon>check_circle</mat-icon> Publish
                </button>
              }
              @if (lesson()?.lifecycleStatus === 'PUBLISHED' && !readOnly()) {
                <button mat-stroked-button type="button" [disabled]="mode.mutationsDisabled() || saving()" (click)="openUnpublishDialog()">Unpublish</button>
              }
              @if ((lesson()?.lifecycleStatus === 'DRAFT' || lesson()?.lifecycleStatus === 'PUBLISHED') && !readOnly()) {
                <button mat-stroked-button color="warn" type="button" [disabled]="mode.mutationsDisabled() || saving()" (click)="openArchiveDialog()">Archive</button>
              }
            }
          </div>

          @if (isEdit() && lesson(); as l) {
            <app-lesson-block-list [lessonId]="l.id" [lessonRowVersion]="l.rowVersion" [disabled]="readOnly() || mode.mutationsDisabled() || saving()"
              (lessonUpdated)="onLessonUpdated($event)" />
          }
        </div>
      }
    }
  `
})
export class LessonEditorComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private lessonApi = inject(LessonApiService);
  private curriculumApi = inject(CurriculumApiService);
  private moduleApi = inject(CurriculumModuleApiService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);
  mode = inject(ClassroomLiteModeService);

  curriculumId = signal<number | null>(null);
  versionId = signal<number | null>(null);
  moduleId = signal<number | null>(null);
  lessonId = signal<number | null>(null);

  version = signal<CurriculumVersion | null>(null);
  module = signal<CurriculumModule | null>(null);
  lesson = signal<Lesson | null>(null);
  loading = signal(true);
  saving = signal(false);
  loadError = signal<CurriculumUiError | null>(null);
  actionError = signal<CurriculumUiError | null>(null);

  private repairValidatedUrl: string | null = null;
  private repairValidatedVideoId = signal<string | null>(null);

  form = {
    title: '',
    practiceNotes: ''
  };

  isEdit = computed(() => this.lessonId() !== null);
  parentDraft = computed(() => this.version()?.status === 'DRAFT');
  /** CURR-FUNC-05: ARCHIVED is terminal and read-only, independent of the parent curriculum version's own status -- an archived lesson stays read-only even while its parent is still DRAFT. */
  isArchived = computed(() => this.lesson()?.lifecycleStatus === 'ARCHIVED');
  /** MC-3: a non-null legacy contentType means this lesson predates the block editor -- its single-content fields are frozen residue, never editable here again. */
  isLegacyLesson = computed(() => {
    const l = this.lesson();
    return l !== null && l.contentType !== null;
  });
  /** CURR-FUNC-06: true only once the module is confirmed ARCHIVED -- distinct from moduleConfirmedWritable() below, which also stays false while the module is still loading. */
  moduleArchived = computed(() => this.module()?.contentStatus === 'ARCHIVED');
  moduleConfirmedWritable = computed(() => this.module() !== null && this.module()!.contentStatus !== 'ARCHIVED');
  /** Every editable control and Save's visibility key off this, not off parentDraft() alone -- an archived lesson, or an archived module, is read-only regardless of the parent version's own status. */
  readOnly = computed(() => !this.parentDraft() || this.isArchived() || !this.moduleConfirmedWritable());
  needsLegacyRepair = computed(() => {
    const l = this.lesson();
    return !!l && l.contentType === 'VIDEO' && l.lifecycleStatus === 'PUBLISHED' && l.videoAvailability === 'UNAVAILABLE';
  });
  repairReady = computed(() => !!this.repairValidatedVideoId());
  /**
   * A block-native lesson's publish-readiness (at least one complete
   * block, VIDEO reachability re-checked live) is entirely backend-
   * authoritative (LessonContentBlockService.assertPublishReady) -- there
   * is no equivalent client-side pre-check here, since block completeness
   * can change from a child component this one doesn't deeply inspect.
   * Publish is always offered; a genuinely not-ready lesson is rejected by
   * the server with a normal actionError, exactly like every other
   * server-validated action on this page. A legacy VIDEO lesson keeps its
   * own always-true gate here too -- LessonService.publish()'s legacy
   * branch does its own reachability/attestation check server-side
   * regardless.
   */
  publishReady = computed(() => true);

  ngOnInit() {
    this.curriculumId.set(Number(this.route.snapshot.paramMap.get('curriculumId')));
    this.versionId.set(Number(this.route.snapshot.paramMap.get('versionId')));
    this.moduleId.set(Number(this.route.snapshot.paramMap.get('moduleId')));
    const lessonIdParam = this.route.snapshot.paramMap.get('lessonId');
    this.lessonId.set(lessonIdParam ? Number(lessonIdParam) : null);
    this.load();
  }

  load() {
    const cId = this.curriculumId(), vId = this.versionId(), mId = this.moduleId();
    if (cId === null || vId === null || mId === null) return;
    this.loading.set(true);
    this.loadError.set(null);
    this.actionError.set(null);
    this.module.set(null);
    this.curriculumApi.getVersion(cId, vId).subscribe({
      next: v => this.version.set(v),
      error: (err: HttpErrorResponse) => this.loadError.set(toCurriculumUiError(err))
    });
    // CURR-FUNC-06: no single-module GET endpoint exists -- compose from the
    // existing list endpoint, same established pattern ModuleDetailPanelComponent
    // and LessonListComponent already use.
    this.moduleApi.list(vId).subscribe({
      next: modules => this.module.set(modules.find(m => m.id === mId) ?? null),
      error: () => this.module.set(null)
    });

    const lId = this.lessonId();
    if (lId === null) {
      this.loading.set(false);
      return;
    }
    this.lessonApi.list(mId).subscribe({
      next: lessons => {
        const found = lessons.find(l => l.id === lId) ?? null;
        this.lesson.set(found);
        if (found) {
          this.form.title = found.title;
          this.form.practiceNotes = found.practiceNotes ?? '';
        } else {
          this.loadError.set({ kind: 'not-found', message: 'This lesson is unavailable.', resource: 'Lesson' });
        }
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => { this.loadError.set(toCurriculumUiError(err)); this.loading.set(false); }
    });
  }

  onRepairValidated(e: YouTubeValidatedEvent) {
    if (e.result === 'VALID') {
      this.repairValidatedUrl = e.url;
      this.repairValidatedVideoId.set(e.videoId);
    } else {
      this.repairValidatedUrl = null;
      this.repairValidatedVideoId.set(null);
    }
  }

  onRepairCleared() {
    this.repairValidatedUrl = null;
    this.repairValidatedVideoId.set(null);
  }

  /** LessonContentBlockMutationResponse/ListMutationResponse's own row-version contract: replace the cached Lesson verbatim, never arithmetic. */
  onLessonUpdated(updated: Lesson) {
    this.lesson.set(updated);
  }

  save() {
    const mId = this.moduleId();
    if (mId === null) return;
    // CURR-FUNC-05/06: defense-in-depth -- Save is never rendered while readOnly() is true, but this guards against any stale-DOM/programmatic path reaching here anyway.
    if (this.readOnly()) return;
    if (!this.form.title.trim()) {
      this.actionError.set({ kind: 'validation', message: 'Enter a title before saving.', resource: 'Lesson' });
      return;
    }
    this.saving.set(true);
    this.actionError.set(null);

    if (!this.isEdit()) {
      const body: CreateLessonRequest = {
        title: this.form.title.trim(),
        practiceNotes: this.form.practiceNotes.trim() || null
      };
      this.lessonApi.create(mId, body).subscribe({
        next: created => {
          this.saving.set(false);
          this.snack.open('Saved.', 'OK', { duration: 2000 });
          // A brand-new lesson has no blocks yet -- route into edit mode so
          // LessonBlockListComponent has a real lessonId/rowVersion to work with.
          this.router.navigate(['/vidya-rasa/curricula', this.curriculumId(), 'versions', this.versionId(), 'modules', mId, 'lessons', created.id, 'edit']);
        },
        error: (err: HttpErrorResponse) => { this.saving.set(false); this.actionError.set(toCurriculumUiError(err)); }
      });
      return;
    }

    const l = this.lesson();
    if (!l) { this.saving.set(false); return; }
    const body: UpdateLessonRequest = {
      title: this.form.title.trim(),
      practiceNotes: this.form.practiceNotes.trim() || null,
      expectedRowVersion: l.rowVersion
    };
    this.lessonApi.update(l.id, body).subscribe({
      next: updated => {
        this.saving.set(false);
        this.lesson.set(updated);
        this.snack.open('Saved.', 'OK', { duration: 2000 });
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        const e = toCurriculumUiError(err);
        if (e.kind === 'conflict') e.message = 'This lesson was already changed — reload before saving';
        this.actionError.set(e);
      }
    });
  }

  openPublishDialog() {
    const l = this.lesson();
    if (!l) return;
    // Attestation applies only to a genuinely legacy VIDEO lesson -- a
    // block-native lesson's publish has no attestation mechanism at all
    // (chk_lsn_attestation_video_only still requires content_type = 'VIDEO'
    // for a non-null attested_at; V46 deliberately left that untouched).
    const data: PublishAttestationDialogData = { mode: 'publish', isVideo: l.contentType === 'VIDEO' };
    this.dialog.open(PublishAttestationDialog, { width: '480px', data })
      .afterClosed().subscribe((result: PublishAttestationDialogResult | null) => {
        if (!result) return;
        this.saving.set(true);
        this.lessonApi.publish(l.id, { expectedRowVersion: l.rowVersion, attested: result.attested }).subscribe({
          next: updated => { this.saving.set(false); this.lesson.set(updated); this.snack.open('Published.', 'OK', { duration: 2500 }); },
          error: (err: HttpErrorResponse) => {
            this.saving.set(false);
            const e = toCurriculumUiError(err);
            if (e.kind === 'conflict') e.message = 'This lesson was already changed — reload to see the latest content';
            this.actionError.set(e);
          }
        });
      });
  }

  openUnpublishDialog() {
    const l = this.lesson();
    if (!l) return;
    this.dialog.open(UnpublishConfirmLessonDialog, { width: '480px', data: { title: l.title } })
      .afterClosed().subscribe((confirmed: boolean) => {
        if (!confirmed) return;
        this.saving.set(true);
        this.lessonApi.unpublish(l.id, { expectedRowVersion: l.rowVersion }).subscribe({
          next: updated => { this.saving.set(false); this.lesson.set(updated); this.snack.open('Unpublished.', 'OK', { duration: 2500 }); },
          error: (err: HttpErrorResponse) => {
            this.saving.set(false);
            const e = toCurriculumUiError(err);
            if (e.kind === 'conflict') e.message = 'This lesson was already unpublished or changed — reload';
            this.actionError.set(e);
          }
        });
      });
  }

  openArchiveDialog() {
    const l = this.lesson();
    if (!l) return;
    this.dialog.open(ArchiveConfirmLessonDialog, { width: '480px', data: { title: l.title } })
      .afterClosed().subscribe((confirmed: boolean) => {
        if (!confirmed) return;
        this.saving.set(true);
        this.lessonApi.archive(l.id, { expectedRowVersion: l.rowVersion }).subscribe({
          next: () => { this.saving.set(false); this.snack.open('Archived.', 'OK', { duration: 2500 }); this.goToList(); },
          error: (err: HttpErrorResponse) => {
            this.saving.set(false);
            const e = toCurriculumUiError(err);
            if (e.kind === 'conflict') e.message = 'This lesson was already archived — reload';
            this.actionError.set(e);
          }
        });
      });
  }

  openRepairDialog() {
    const l = this.lesson();
    if (!l || !this.repairValidatedUrl) return;
    const data: PublishAttestationDialogData = { mode: 'republish', isVideo: true };
    this.dialog.open(PublishAttestationDialog, { width: '480px', data })
      .afterClosed().subscribe((result: PublishAttestationDialogResult | null) => {
        if (!result) return;
        this.saving.set(true);
        this.lessonApi.repairVideo(l.id, { url: this.repairValidatedUrl!, expectedRowVersion: l.rowVersion, attested: result.attested }).subscribe({
          next: updated => {
            this.saving.set(false);
            this.lesson.set(updated);
            this.repairValidatedUrl = null;
            this.repairValidatedVideoId.set(null);
            this.snack.open('Video restored — students can play it again.', 'OK', { duration: 3000 });
          },
          error: (err: HttpErrorResponse) => {
            this.saving.set(false);
            const e = toCurriculumUiError(err);
            if (e.kind === 'conflict') e.message = 'This lesson was already changed — reload before repairing';
            this.actionError.set(e);
          }
        });
      });
  }

  close() { this.goToList(); }

  private goToList() {
    const cId = this.curriculumId(), vId = this.versionId(), mId = this.moduleId();
    this.router.navigate(['/vidya-rasa/curricula', cId, 'versions', vId, 'modules', mId, 'lessons']);
  }
}
