import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { Lesson } from '../../../core/models/curriculum.model';
import { LessonApiService } from '../../../core/services/lesson-api.service';
import { ClassroomLiteModeService } from '../../../core/services/classroom-lite-mode.service';
import { CurriculumUiError, toCurriculumUiError } from '../../../core/services/curriculum-api-error.util';
import { ClassroomLiteBannerComponent } from '../../../shared/curriculum/classroom-lite-banner';
import { CurriculumMessageComponent } from '../../../shared/curriculum/curriculum-message';
import { FullOutageBlockComponent } from '../../../shared/curriculum/full-outage-block';

/**
 * Figure 3 (Lesson Preview) -- a non-releasing, read-only rendering of
 * exactly what a student will see (Slice 7 §6.5). Real
 * youtube-nocookie.com privacy-enhanced embed, constructed only from the
 * validated backend video id (Slice 9 binding decision 2) -- never
 * arbitrary embed HTML, never autoplay.
 *
 * check-video preflight (Slice 9 binding decision 3): invoked automatically
 * only when the open lesson is a PUBLISHED VIDEO currently marked
 * AVAILABLE -- never merely by opening this screen for a non-video or
 * already-UNAVAILABLE lesson, and never from the Editor. A definitive
 * unavailability result (backend flips videoAvailability to UNAVAILABLE)
 * shows the same neutral blocked-playback message a student would see. A
 * transient failure (typed 503) leaves availability untouched and shows a
 * retryable preview error instead -- it is never presented as "video
 * unavailable". Repair/republish (Lesson Editor) always runs its own fresh
 * validation regardless of this preflight's outcome.
 */
@Component({
  selector: 'app-lesson-preview',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatCardModule, ClassroomLiteBannerComponent, CurriculumMessageComponent, FullOutageBlockComponent],
  styles: [`
    button[mat-flat-button], button[mat-stroked-button], button[mat-button] { min-height: 44px; }
    :host { display: block; }
    .preview-banner {
      display: flex; align-items: center; gap: 8px; padding: 8px 14px; border-radius: 8px;
      background: #eef0fb; color: #3d4ed8; font-size: 0.8rem; font-weight: 600; margin-bottom: 12px;
      text-transform: uppercase; letter-spacing: 0.04em;
    }
    .panel { max-width: 760px; }
    .embed-frame { position: relative; width: 100%; aspect-ratio: 16/9; background: #000; border-radius: 8px; overflow: hidden; }
    .embed-frame iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
    .unavailable-block {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 10px; width: 100%; aspect-ratio: 16/9; background: #f1f5f9; color: #475569;
      border-radius: 8px; text-align: center; padding: 24px;
    }
    .lesson-text { white-space: pre-wrap; line-height: 1.6; }
    .resource-card { display: flex; align-items: center; gap: 10px; padding: 16px; border: 1px solid #e2e8f0; border-radius: 8px; }
    .nav-row { display: flex; justify-content: space-between; margin-top: 20px; }
    .reserved-entry {
      border: 1px dashed #d1d5db; border-radius: 8px; padding: 14px; margin-top: 20px;
      color: #6c757d; font-size: 0.85rem;
    }
  `],
  template: `
    <div class="page-header">
      <div style="display:flex;align-items:center;gap:6px">
        <button mat-icon-button (click)="close()" aria-label="Exit Preview">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <h2 style="margin:0">Lesson Preview</h2>
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
      } @else if (lesson(); as l) {
        <div class="panel">
          <div class="preview-banner">
            <mat-icon aria-hidden="true">visibility</mat-icon> Preview mode — this is exactly what a student will see
          </div>

          <h3 style="margin:0 0 12px">{{ l.title }}</h3>

          @if (l.contentType === 'VIDEO') {
            @if (checkingVideo()) {
              <div class="unavailable-block"><p style="color:#adb5bd">Checking video…</p></div>
            } @else if (previewError()) {
              <app-curriculum-message [error]="previewError()" (retry)="checkVideoThenRender()" />
            } @else if (l.videoAvailability === 'UNAVAILABLE') {
              <div class="unavailable-block">
                <mat-icon aria-hidden="true" style="font-size:32px;width:32px;height:32px">videocam_off</mat-icon>
                <p>This video is currently unavailable.</p>
              </div>
            } @else if (embedUrl()) {
              <div class="embed-frame">
                <iframe [src]="embedUrl()" title="Lesson video" allow="encrypted-media" allowfullscreen></iframe>
              </div>
            }
          } @else if (l.contentType === 'TEXT') {
            <p class="lesson-text">{{ l.textContent }}</p>
          } @else {
            <div class="resource-card">
              <mat-icon aria-hidden="true">{{ l.contentType === 'PDF_LINK' ? 'picture_as_pdf' : 'link' }}</mat-icon>
              <a [href]="l.externalUrl" target="_blank" rel="noopener noreferrer">{{ l.externalLinkLabel }}</a>
            </div>
          }

          @if (l.practiceNotes) {
            <p style="margin-top:16px;color:#6c757d;font-size:0.85rem">{{ l.practiceNotes }}</p>
          }

          <div class="reserved-entry">
            <mat-icon aria-hidden="true" style="vertical-align:middle;font-size:18px;width:18px;height:18px">lock_clock</mat-icon>
            No linked assignment. Assignment authoring is reserved for a later slice (Slice 13).
          </div>

          <div class="nav-row">
            <button mat-stroked-button type="button" [disabled]="!previousLesson()" (click)="goTo(previousLesson())">
              <mat-icon>chevron_left</mat-icon> Previous
            </button>
            <button mat-stroked-button type="button" [disabled]="!nextLesson()" (click)="goTo(nextLesson())">
              Next <mat-icon>chevron_right</mat-icon>
            </button>
          </div>
        </div>
      }
    }
  `
})
export class LessonPreviewComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private lessonApi = inject(LessonApiService);
  private sanitizer = inject(DomSanitizer);
  mode = inject(ClassroomLiteModeService);

  curriculumId = signal<number | null>(null);
  versionId = signal<number | null>(null);
  moduleId = signal<number | null>(null);
  lessonId = signal<number | null>(null);

  lesson = signal<Lesson | null>(null);
  allLessons = signal<Lesson[]>([]);
  loading = signal(true);
  checkingVideo = signal(false);
  loadError = signal<CurriculumUiError | null>(null);
  previewError = signal<CurriculumUiError | null>(null);

  publishedLessons = computed(() => this.allLessons().filter(l => l.lifecycleStatus === 'PUBLISHED').sort((a, b) => a.lessonOrder - b.lessonOrder));
  private currentIndex = computed(() => this.publishedLessons().findIndex(l => l.id === this.lessonId()));
  previousLesson = computed<Lesson | null>(() => {
    const i = this.currentIndex();
    return i > 0 ? this.publishedLessons()[i - 1] : null;
  });
  nextLesson = computed<Lesson | null>(() => {
    const i = this.currentIndex();
    const list = this.publishedLessons();
    return i >= 0 && i < list.length - 1 ? list[i + 1] : null;
  });

  embedUrl = computed<SafeResourceUrl | null>(() => {
    const l = this.lesson();
    if (!l || l.contentType !== 'VIDEO' || !l.videoId || l.videoAvailability !== 'AVAILABLE') return null;
    // Privacy-enhanced domain, no autoplay, constructed only from the validated backend video id -- never arbitrary embed HTML.
    const url = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(l.videoId)}?autoplay=0`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  });

  ngOnInit() {
    this.curriculumId.set(Number(this.route.snapshot.paramMap.get('curriculumId')));
    this.versionId.set(Number(this.route.snapshot.paramMap.get('versionId')));
    this.moduleId.set(Number(this.route.snapshot.paramMap.get('moduleId')));
    this.lessonId.set(Number(this.route.snapshot.paramMap.get('lessonId')));
    this.load();
  }

  load() {
    const mId = this.moduleId(), lId = this.lessonId();
    if (mId === null || lId === null) return;
    this.loading.set(true);
    this.loadError.set(null);
    this.previewError.set(null);
    this.lessonApi.list(mId).subscribe({
      next: lessons => {
        this.allLessons.set(lessons);
        const found = lessons.find(l => l.id === lId) ?? null;
        this.lesson.set(found);
        this.loading.set(false);
        if (!found) {
          this.loadError.set({ kind: 'not-found', message: 'This lesson is unavailable.', resource: 'Lesson' });
          return;
        }
        this.maybeCheckVideo(found);
      },
      error: (err: HttpErrorResponse) => { this.loadError.set(toCurriculumUiError(err)); this.loading.set(false); }
    });
  }

  /** Binding decision 3: preflight only for a PUBLISHED VIDEO currently marked AVAILABLE. */
  private maybeCheckVideo(l: Lesson) {
    if (l.contentType !== 'VIDEO' || l.lifecycleStatus !== 'PUBLISHED' || l.videoAvailability !== 'AVAILABLE') return;
    this.checkVideoThenRender();
  }

  checkVideoThenRender() {
    const l = this.lesson();
    if (!l) return;
    this.checkingVideo.set(true);
    this.previewError.set(null);
    this.lessonApi.checkVideo(l.id, { expectedRowVersion: l.rowVersion }).subscribe({
      next: updated => { this.checkingVideo.set(false); this.lesson.set(updated); },
      error: (err: HttpErrorResponse) => {
        this.checkingVideo.set(false);
        // A typed 503 (transient gateway failure) never proves the video is
        // gone -- availability stays whatever it already was, and this shows
        // a retryable error, never the neutral "unavailable" block.
        this.previewError.set(toCurriculumUiError(err));
      }
    });
  }

  goTo(target: Lesson | null) {
    if (!target) return;
    const cId = this.curriculumId(), vId = this.versionId(), mId = this.moduleId();
    this.router.navigate(['/vidya-rasa/curricula', cId, 'versions', vId, 'modules', mId, 'lessons', target.id, 'preview']);
  }

  close() {
    const cId = this.curriculumId(), vId = this.versionId(), mId = this.moduleId();
    this.router.navigate(['/vidya-rasa/curricula', cId, 'versions', vId, 'modules', mId, 'lessons']);
  }
}
