import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { forkJoin } from 'rxjs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { StudentLearningApiService } from '../../../core/services/student-learning-api.service';
import { ModuleDetailDTO, StudentLessonDetailDTO } from '../../../core/models/student-learning.model';
import { CurriculumMessageComponent } from '../../../shared/curriculum/curriculum-message';
import { CurriculumUiError, toCurriculumUiError } from '../../../core/services/curriculum-api-error.util';
import { backLabelFor, navigateForRecovery } from '../student-learning-recovery.util';

/**
 * Part II.4. Renders exactly consistent with Slice 9's deployed frontend
 * contract for the video embed itself -- same youtube-nocookie.com
 * construction as lesson-preview.ts (no autoplay, sanitized resource URL
 * built only from the server-resolved videoId, never arbitrary embed
 * HTML). Correction 5's precise video-ID rule: videoId is used only to
 * build the iframe src below -- never rendered as visible text, never
 * placed in an error message, never logged.
 *
 * Position-in-module ("Lesson 2 of 4", Part II.4's "Module context" row)
 * is gap #4 from the approved plan: the Slice 11 lesson-detail contract has
 * no positionInModule/moduleLessonCount field, so this screen also fetches
 * Module Detail (which it needs anyway, for the module title) and derives
 * position/count client-side from its already-ordered lessons[] list --
 * no new Slice 11 endpoint or field, per the plan's own resolution.
 */
@Component({
  selector: 'app-lesson-detail',
  standalone: true,
  imports: [RouterLink, MatProgressSpinnerModule, MatIconModule, MatButtonModule, CurriculumMessageComponent],
  styles: [`
    :host { display: block; max-width: 760px; margin: 0 auto; padding: 24px 20px 48px; }
    .breadcrumb { display: flex; align-items: center; gap: 4px; font-size: 0.85rem; color: #6B6255; margin-bottom: 4px; }
    /* 44px touch-target floor (found undersized at 17px during 390px verification): the link text itself is small, so height comes from padding, not font-size. */
    .breadcrumb a { display: inline-flex; align-items: center; min-height: 44px; color: #6B6255; text-decoration: none; }
    .module-context { font-size: 0.8rem; color: #6B6255; margin: 0 0 10px; }
    h1 { font-family: Fraunces, Georgia, serif; font-size: 1.4rem; color: #1C1A16; margin: 0 0 16px; }
    .embed-frame { position: relative; width: 100%; aspect-ratio: 16/9; background: #000; }
    .embed-frame iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
    .unavailable-block {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 10px; width: 100%; aspect-ratio: 16/9; background: #F3EEDE; color: #6B6255; text-align: center; padding: 24px;
      box-sizing: border-box; /* width:100% + padding on the same element overflows its container without this -- found at 320px verification */
    }
    .captions-row { font-size: 0.75rem; color: #6B6255; margin: 8px 0 0; }
    .lesson-text { white-space: pre-wrap; line-height: 1.6; color: #1C1A16; }
    .resource-card { display: flex; align-items: center; gap: 10px; padding: 16px; border: 1px solid #E3DCC8; background: #fff; }
    /* 44px touch-target floor (found undersized at 19.2px during verification-closure numerical layout checks): same fix pattern as the breadcrumb link above -- height comes from padding via inline-flex, not font-size. */
    .resource-card a { display: inline-flex; align-items: center; min-height: 44px; color: #A3762C; font-weight: 600; }
    .practice-notes { margin-top: 20px; padding: 14px 16px; background: #F3EEDE; border: 1px solid #E3DCC8; }
    .practice-notes p { margin: 0; color: #1C1A16; font-size: 0.9rem; }
    .nav-row { display: flex; justify-content: space-between; margin-top: 24px; }
    .nav-row button { min-height: 44px; }
  `],
  template: `
    <div class="breadcrumb">
      <a [routerLink]="['/my-students', studentId(), 'classes', classId(), 'modules', moduleId()]">
        <mat-icon aria-hidden="true" style="font-size:16px;width:16px;height:16px;vertical-align:middle">chevron_left</mat-icon>
        {{ moduleTitle() || 'Module' }}
      </a>
    </div>

    @if (loadError(); as e) {
      <h1 tabindex="-1">Lesson</h1>
      <app-curriculum-message [error]="e" [backLabel]="recoveryLabel(e.kind)" (back)="onBack(e.kind)" />
    } @else if (loading()) {
      <h1 tabindex="-1">Lesson</h1>
      <mat-spinner diameter="36" />
    } @else if (lesson(); as l) {
      @if (positionLabel()) { <p class="module-context">{{ moduleTitle() }} · {{ positionLabel() }}</p> }
      <h1 tabindex="-1">{{ l.title }}</h1>

      @switch (l.contentType) {
        @case ('VIDEO') {
          @if (l.videoAvailability === 'UNAVAILABLE') {
            <div class="unavailable-block">
              <mat-icon aria-hidden="true" style="font-size:32px;width:32px;height:32px">videocam_off</mat-icon>
              <p>This video is private, removed, restricted, or currently unavailable.</p>
            </div>
          } @else if (embedUrl()) {
            <div class="embed-frame">
              <iframe [src]="embedUrl()" title="Lesson video" allow="encrypted-media" allowfullscreen></iframe>
            </div>
            <!-- Illustrative only (Part IV.2/10.5) -- no real caption sourcing/parsing exists yet. -->
            <p class="captions-row">Captions availability varies by video.</p>
          }
        }
        @case ('TEXT') {
          <p class="lesson-text">{{ l.textContent }}</p>
        }
        @default {
          <div class="resource-card">
            <mat-icon aria-hidden="true">{{ l.contentType === 'PDF_LINK' ? 'picture_as_pdf' : 'link' }}</mat-icon>
            <a [href]="l.externalUrl" target="_blank" rel="noopener noreferrer">{{ l.externalLinkLabel || 'Open resource' }}</a>
          </div>
        }
      }

      @if (l.practiceNotes) {
        <div class="practice-notes"><p>{{ l.practiceNotes }}</p></div>
      }

      <div class="nav-row">
        <button mat-stroked-button type="button" [disabled]="!l.previousLessonId" (click)="goTo(l.previousLessonId)">
          <mat-icon aria-hidden="true">chevron_left</mat-icon> Previous
        </button>
        <button mat-stroked-button type="button" [disabled]="!l.nextLessonId" (click)="goTo(l.nextLessonId)">
          Next <mat-icon aria-hidden="true">chevron_right</mat-icon>
        </button>
      </div>
    }
  `
})
export class LessonDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(StudentLearningApiService);
  private destroyRef = inject(DestroyRef);
  private sanitizer = inject(DomSanitizer);

  studentId = signal<number>(0);
  classId = signal<number>(0);
  moduleId = signal<number>(0);
  lessonId = signal<number>(0);

  lesson = signal<StudentLessonDetailDTO | null>(null);
  moduleDetail = signal<ModuleDetailDTO | null>(null);
  loading = signal(true);
  loadError = signal<CurriculumUiError | null>(null);

  moduleTitle = computed(() => this.moduleDetail()?.title ?? null);

  positionLabel = computed(() => {
    const m = this.moduleDetail();
    const lessons = m?.lessons;
    if (!lessons || lessons.length === 0) return null;
    const idx = lessons.findIndex(l => l.lessonId === this.lessonId());
    if (idx < 0) return null;
    return `Lesson ${idx + 1} of ${lessons.length}`;
  });

  embedUrl = computed<SafeResourceUrl | null>(() => {
    const l = this.lesson();
    if (!l || l.contentType !== 'VIDEO' || !l.videoId || l.videoAvailability !== 'AVAILABLE') return null;
    // Privacy-enhanced domain, no autoplay -- identical construction to lesson-preview.ts (Slice 9), never arbitrary embed HTML.
    const url = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(l.videoId)}?autoplay=0`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  });

  ngOnInit() {
    const studentId = Number(this.route.snapshot.paramMap.get('studentId'));
    const classId = Number(this.route.snapshot.paramMap.get('classId'));
    const moduleId = Number(this.route.snapshot.paramMap.get('moduleId'));
    const lessonId = Number(this.route.snapshot.paramMap.get('lessonId'));
    this.studentId.set(studentId);
    this.classId.set(classId);
    this.moduleId.set(moduleId);
    this.lessonId.set(lessonId);
    this.load(studentId, classId, moduleId, lessonId);
  }

  private load(studentId: number, classId: number, moduleId: number, lessonId: number) {
    this.loading.set(true);
    this.loadError.set(null);
    forkJoin({
      lesson: this.api.lessonDetail(studentId, classId, moduleId, lessonId),
      module: this.api.moduleDetail(studentId, classId, moduleId)
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ lesson, module }) => {
        this.loading.set(false);
        this.lesson.set(lesson);
        this.moduleDetail.set(module);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.loadError.set(toCurriculumUiError(err));
      }
    });
  }

  goTo(targetLessonId?: number) {
    if (!targetLessonId) return;
    this.router.navigate(['/my-students', this.studentId(), 'classes', this.classId(), 'modules', this.moduleId(), 'lessons', targetLessonId]);
  }

  recoveryLabel(kind: CurriculumUiError['kind']): string | null {
    return backLabelFor(kind, this.moduleTitle() || 'Module');
  }

  onBack(kind: CurriculumUiError['kind']) {
    navigateForRecovery(this.router, kind, this.studentId(), ['/my-students', this.studentId(), 'classes', this.classId(), 'modules', this.moduleId()]);
  }
}
