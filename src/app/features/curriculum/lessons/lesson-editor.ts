import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import {
  Lesson, LessonContentType, CurriculumVersion, CreateLessonRequest, UpdateLessonRequest
} from '../../../core/models/curriculum.model';
import { LessonApiService } from '../../../core/services/lesson-api.service';
import { CurriculumApiService } from '../../../core/services/curriculum-api.service';
import { ClassroomLiteModeService } from '../../../core/services/classroom-lite-mode.service';
import { CurriculumUiError, toCurriculumUiError } from '../../../core/services/curriculum-api-error.util';
import { ClassroomLiteBannerComponent } from '../../../shared/curriculum/classroom-lite-banner';
import { CurriculumMessageComponent } from '../../../shared/curriculum/curriculum-message';
import { FullOutageBlockComponent } from '../../../shared/curriculum/full-outage-block';
import { YouTubeUrlValidatorComponent, YouTubeValidatedEvent } from './youtube-url-validator';
import { PublishAttestationDialog, PublishAttestationDialogData, PublishAttestationDialogResult } from './publish-attestation-dialog';
import { UnpublishConfirmLessonDialog } from './unpublish-confirm-lesson-dialog';
import { ArchiveConfirmLessonDialog } from './archive-confirm-lesson-dialog';

const CONTENT_TYPES: { value: LessonContentType; label: string }[] = [
  { value: 'VIDEO', label: 'Video' },
  { value: 'TEXT', label: 'Text' },
  { value: 'PDF_LINK', label: 'PDF Link' },
  { value: 'EXTERNAL_LINK', label: 'External Link' }
];

/**
 * Figure 2 (Lesson Editor), create and edit in one component (route-param
 * mode, matching CurriculumBuilderComponent's own create/edit dual-mode
 * pattern). No single-lesson GET endpoint exists -- edit mode loads via the
 * existing list-by-module endpoint and selects the routed :lessonId,
 * exactly the same data-composition rule ModuleDetailPanelComponent
 * already uses.
 *
 * Repair/Republish (Slice 7 §6.1's added transition row, Slice 8 correction
 * 1): whenever videoAvailability is UNAVAILABLE, the video field always
 * routes through the dedicated repair-video endpoint + a fresh attestation
 * -- never the ordinary update() call -- since only repair-video clears the
 * availability flag and re-attests. This holds regardless of the parent
 * curriculum version's DRAFT/ACTIVE status (the one guarded lesson
 * mutation permitted after activation).
 */
@Component({
  selector: 'app-lesson-editor',
  standalone: true,
  imports: [
    FormsModule, MatButtonModule, MatIconModule, MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonToggleModule, MatDialogModule, MatSnackBarModule,
    ClassroomLiteBannerComponent, CurriculumMessageComponent, FullOutageBlockComponent, YouTubeUrlValidatorComponent
  ],
  styles: [`
    button[mat-flat-button], button[mat-stroked-button], button[mat-button] { min-height: 44px; }
    :host { display: block; }
    .panel { max-width: 720px; display: flex; flex-direction: column; gap: 16px; }
    .field-row { display: flex; flex-direction: column; gap: 4px; }
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

          @if (!parentDraft() && needsRepair()) {
            <p class="readonly-note">The parent curriculum version is no longer DRAFT — structural edits require a new cloned draft. Only video repair remains available for this lesson.</p>
          } @else if (!parentDraft()) {
            <p class="readonly-note">The parent curriculum version is no longer DRAFT — structural edits require a new cloned draft.</p>
          }

          <mat-form-field appearance="outline">
            <mat-label>Title</mat-label>
            <input matInput [(ngModel)]="form.title" maxlength="120" [disabled]="!parentDraft() || mode.mutationsDisabled() || saving()" />
          </mat-form-field>

          <div class="field-row">
            <label id="content-type-label" style="font-size:0.82rem;color:#52596b">Content type</label>
            <mat-button-toggle-group aria-labelledby="content-type-label" [ngModel]="contentType()" (ngModelChange)="onContentTypeChange($event)" [disabled]="isEdit() || !parentDraft() || mode.mutationsDisabled() || saving()">
              @for (t of contentTypes; track t.value) {
                <mat-button-toggle [value]="t.value">{{ t.label }}</mat-button-toggle>
              }
            </mat-button-toggle-group>
          </div>

          @switch (contentType()) {
            @case ('VIDEO') {
              @if (needsRepair()) {
                <div class="repair-banner">
                  <mat-icon aria-hidden="true">warning</mat-icon>
                  This video is private, removed, restricted, or currently unavailable. Repair or replace the link.
                </div>
                <app-youtube-url-validator [disabled]="mode.mutationsDisabled() || saving()" (validated)="onRepairValidated($event)" />
                <div class="actions">
                  <button mat-flat-button color="primary" type="button" [disabled]="!repairReady() || mode.mutationsDisabled() || saving()" (click)="openRepairDialog()">
                    Republish Video
                  </button>
                </div>
              } @else {
                @if (isEdit()) {
                  <p class="readonly-note">
                    A YouTube video is currently linked. Re-enter and validate a YouTube URL to replace it or save video changes.
                  </p>
                }
                <app-youtube-url-validator
                  [disabled]="!parentDraft() || mode.mutationsDisabled() || saving()"
                  (validated)="onVideoValidated($event)" />
              }
            }
            @case ('TEXT') {
              <mat-form-field appearance="outline">
                <mat-label>Lesson text</mat-label>
                <textarea matInput rows="6" [(ngModel)]="form.textContent" placeholder="Write the lesson content students will read" [disabled]="!parentDraft() || mode.mutationsDisabled() || saving()"></textarea>
              </mat-form-field>
            }
            @case ('PDF_LINK') {
              <mat-form-field appearance="outline">
                <mat-label>PDF URL</mat-label>
                <input matInput [(ngModel)]="form.externalUrl" placeholder="Link to a PDF your students can open" [disabled]="!parentDraft() || mode.mutationsDisabled() || saving()" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Label</mat-label>
                <input matInput [(ngModel)]="form.externalLinkLabel" placeholder="Label shown to students" [disabled]="!parentDraft() || mode.mutationsDisabled() || saving()" />
              </mat-form-field>
            }
            @case ('EXTERNAL_LINK') {
              <mat-form-field appearance="outline">
                <mat-label>External URL</mat-label>
                <input matInput [(ngModel)]="form.externalUrl" placeholder="Link to a supporting resource" [disabled]="!parentDraft() || mode.mutationsDisabled() || saving()" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Label</mat-label>
                <input matInput [(ngModel)]="form.externalLinkLabel" placeholder="Label shown to students" [disabled]="!parentDraft() || mode.mutationsDisabled() || saving()" />
              </mat-form-field>
            }
          }

          <mat-form-field appearance="outline">
            <mat-label>Practice notes (optional)</mat-label>
            <textarea matInput rows="3" [(ngModel)]="form.practiceNotes" placeholder="About this lesson and any practice guidance" [disabled]="!parentDraft() || mode.mutationsDisabled() || saving()"></textarea>
          </mat-form-field>

          <div class="actions">
            @if (!isEdit()) {
              <button mat-flat-button color="primary" type="button" [disabled]="mode.mutationsDisabled() || saving() || !saveReady()" (click)="save()">
                Save as Draft
              </button>
            } @else {
              @if (parentDraft()) {
                <button mat-stroked-button type="button" [disabled]="mode.mutationsDisabled() || saving() || !saveReady()" (click)="save()">Save</button>
              }
              @if (lesson()?.lifecycleStatus === 'DRAFT' && parentDraft()) {
                <button mat-flat-button color="primary" type="button" [disabled]="mode.mutationsDisabled() || saving() || !publishReady()" (click)="openPublishDialog()">
                  <mat-icon>check_circle</mat-icon> Publish
                </button>
              }
              @if (lesson()?.lifecycleStatus === 'PUBLISHED' && parentDraft()) {
                <button mat-stroked-button type="button" [disabled]="mode.mutationsDisabled() || saving()" (click)="openUnpublishDialog()">Unpublish</button>
              }
              @if ((lesson()?.lifecycleStatus === 'DRAFT' || lesson()?.lifecycleStatus === 'PUBLISHED') && parentDraft()) {
                <button mat-stroked-button color="warn" type="button" [disabled]="mode.mutationsDisabled() || saving()" (click)="openArchiveDialog()">Archive</button>
              }
            }
          </div>
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
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);
  mode = inject(ClassroomLiteModeService);

  contentTypes = CONTENT_TYPES;

  curriculumId = signal<number | null>(null);
  versionId = signal<number | null>(null);
  moduleId = signal<number | null>(null);
  lessonId = signal<number | null>(null);

  version = signal<CurriculumVersion | null>(null);
  lesson = signal<Lesson | null>(null);
  loading = signal(true);
  saving = signal(false);
  loadError = signal<CurriculumUiError | null>(null);
  actionError = signal<CurriculumUiError | null>(null);

  // Signals, not plain fields: publishReady()/repairReady() are computed()
  // and only re-evaluate when a signal dependency they read actually
  // changes -- a plain mutable field here would leave those computeds
  // cached at their first (empty) value forever. contentType is a signal
  // for exactly this reason (bug found in the Dev Dance School lesson
  // pilot: reading a plain `form.contentType` field inside a computed()
  // left Save permanently disabled after switching off the default VIDEO
  // type, since the computed had no tracked dependency to re-run on).
  contentType = signal<LessonContentType>('VIDEO');
  private validatedVideoId = signal<string | null>(null);
  private repairValidatedUrl: string | null = null;
  private repairValidatedVideoId = signal<string | null>(null);

  isEdit = computed(() => this.lessonId() !== null);
  parentDraft = computed(() => this.version()?.status === 'DRAFT');
  needsRepair = computed(() => {
    const l = this.lesson();
    return !!l && l.contentType === 'VIDEO' && l.lifecycleStatus === 'PUBLISHED' && l.videoAvailability === 'UNAVAILABLE';
  });
  repairReady = computed(() => !!this.repairValidatedVideoId());
  // Every VIDEO create/update call re-validates the URL server-side (LessonService
  // never trusts a stored value on update) -- Publish must always require a fresh
  // in-session validation, never fall back to the lesson's already-stored videoId.
  publishReady = computed(() => this.contentType() !== 'VIDEO' || !!this.lesson()?.videoId);

  form = {
    title: '',
    textContent: '',
    externalUrl: '',
    externalLinkLabel: '',
    practiceNotes: ''
  };

  /**
   * Deliberately a plain method, not a computed(): it must react to every
   * keystroke in title/textContent/externalUrl/externalLinkLabel, which are
   * plain ngModel-bound fields, not signals. A template-invoked method
   * re-evaluates on every change-detection tick regardless of whether its
   * reads are signals, so this needs no caching workaround the way the
   * contentType-only checks above do.
   */
  saveReady(): boolean {
    if (!this.form.title.trim()) return false;
    switch (this.contentType()) {
      case 'VIDEO': return !!this.validatedVideoId();
      case 'TEXT': return !!this.form.textContent.trim();
      case 'PDF_LINK':
      case 'EXTERNAL_LINK': return !!this.form.externalUrl.trim() && !!this.form.externalLinkLabel.trim();
    }
  }

  /** Switching type must never leak a prior VIDEO validation into a save under a different type, and switching back to VIDEO must always require a fresh Validate. */
  onContentTypeChange(next: LessonContentType) {
    this.contentType.set(next);
    this.validatedVideoId.set(null);
    this.lastValidatedUrl = null;
  }

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
    this.curriculumApi.getVersion(cId, vId).subscribe({
      next: v => this.version.set(v),
      error: (err: HttpErrorResponse) => this.loadError.set(toCurriculumUiError(err))
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
          this.contentType.set(found.contentType);
          this.form.textContent = found.textContent ?? '';
          this.form.externalUrl = found.externalUrl ?? '';
          this.form.externalLinkLabel = found.externalLinkLabel ?? '';
          this.form.practiceNotes = found.practiceNotes ?? '';
        } else {
          this.loadError.set({ kind: 'not-found', message: 'This lesson is unavailable.', resource: 'Lesson' });
        }
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => { this.loadError.set(toCurriculumUiError(err)); this.loading.set(false); }
    });
  }

  onVideoValidated(e: YouTubeValidatedEvent) {
    this.validatedVideoId.set(e.result === 'VALID' ? e.videoId : null);
    this.lastValidatedUrl = e.result === 'VALID' ? e.url : null;
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

  save() {
    const mId = this.moduleId();
    if (mId === null) return;
    if (!this.saveReady()) {
      const message = this.contentType() === 'VIDEO' ? 'Validate the YouTube URL before saving.' : 'Fill in the required fields before saving.';
      this.actionError.set({ kind: 'validation', message, resource: 'Lesson' });
      return;
    }
    this.saving.set(true);
    this.actionError.set(null);

    if (!this.isEdit()) {
      const type = this.contentType();
      const body: CreateLessonRequest = {
        title: this.form.title.trim(),
        contentType: type,
        youtubeUrl: type === 'VIDEO' ? this.currentVideoUrlForCreate() : null,
        textContent: type === 'TEXT' ? this.form.textContent.trim() : null,
        externalUrl: (type === 'PDF_LINK' || type === 'EXTERNAL_LINK') ? this.form.externalUrl.trim() : null,
        externalLinkLabel: (type === 'PDF_LINK' || type === 'EXTERNAL_LINK') ? this.form.externalLinkLabel.trim() : null,
        practiceNotes: this.form.practiceNotes.trim() || null,
        lessonOrder: 1
      };
      this.lessonApi.create(mId, body).subscribe({
        next: created => { this.saving.set(false); this.snack.open('Saved.', 'OK', { duration: 2000 }); this.goToList(); },
        error: (err: HttpErrorResponse) => { this.saving.set(false); this.actionError.set(toCurriculumUiError(err)); }
      });
      return;
    }

    const l = this.lesson();
    if (!l) { this.saving.set(false); return; }
    const body: UpdateLessonRequest = {
      title: this.form.title.trim(),
      youtubeUrl: l.contentType === 'VIDEO' ? this.currentVideoUrlForUpdate() : null,
      textContent: l.contentType === 'TEXT' ? this.form.textContent.trim() : null,
      externalUrl: (l.contentType === 'PDF_LINK' || l.contentType === 'EXTERNAL_LINK') ? this.form.externalUrl.trim() : null,
      externalLinkLabel: (l.contentType === 'PDF_LINK' || l.contentType === 'EXTERNAL_LINK') ? this.form.externalLinkLabel.trim() : null,
      practiceNotes: this.form.practiceNotes.trim() || null,
      expectedRowVersion: l.rowVersion
    };
    this.lessonApi.update(l.id, body).subscribe({
      next: updated => { this.saving.set(false); this.lesson.set(updated); this.snack.open('Saved.', 'OK', { duration: 2000 }); },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        const e = toCurriculumUiError(err);
        if (e.kind === 'conflict') e.message = 'This lesson was already changed — reload before saving';
        this.actionError.set(e);
      }
    });
  }

  private currentVideoUrlForCreate(): string | null {
    // The classifier requires a URL, not just an id -- Save is gated on
    // publishReady()/validatedVideoId, and the validator already POSTed
    // this exact URL server-side during Validate & Preview.
    return this.validatedVideoId() ? this.lastValidatedUrl : null;
  }

  private currentVideoUrlForUpdate(): string | null {
    return this.validatedVideoId() ? this.lastValidatedUrl : null;
  }

  private lastValidatedUrl: string | null = null;

  openPublishDialog() {
    const l = this.lesson();
    if (!l) return;
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
