import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { StudentLearningApiService } from '../../../core/services/student-learning-api.service';
import { ModuleDetailDTO, StudentContentBlock, StudentLessonDetailDTO } from '../../../core/models/student-learning.model';
import { CurriculumMessageComponent } from '../../../shared/curriculum/curriculum-message';
import { LessonBlockContentRendererComponent } from '../../../shared/curriculum/lesson-block-content-renderer';
import { CurriculumUiError, toCurriculumUiError } from '../../../core/services/curriculum-api-error.util';
import { backLabelFor, navigateForRecovery } from '../student-learning-recovery.util';

/**
 * Part II.4. MC-4: block-native -- content is now zero-or-more ordered
 * `blocks`, rendered via the shared `LessonBlockContentRendererComponent`
 * (moved, not copied, from the admin curriculum feature in this same
 * change) instead of a single `@switch (l.contentType)`. Each block gets
 * its own thin, student-specific caption wrapper around that shared
 * primitive (PDF's "PDF document" tag; EXTERNAL_LINK's derived domain +
 * "Opens in a new tab" microcopy) -- the primitive itself stays generic,
 * unaware of admin vs. student context, per the architect's explicit
 * "shared primitive, caller-supplied chrome" instruction.
 *
 * <p>Blocks-only cutover (architect decision): no legacy-content fallback
 * exists here. An empty `blocks` list (every block malformed, or a
 * pre-MC-4 legacy lesson with none) shows the approved "This lesson's
 * content isn't available right now." copy in the content area only --
 * title, practice notes, and previous/next navigation all stay available
 * regardless; this state is never converted into a 404/error screen.
 *
 * <p>Position-in-module ("Lesson 2 of 4", Part II.4's "Module context" row)
 * is gap #4 from the approved plan: the Slice 11 lesson-detail contract has
 * no positionInModule/moduleLessonCount field, so this screen also fetches
 * Module Detail (which it needs anyway, for the module title) and derives
 * position/count client-side from its already-ordered lessons[] list --
 * no new Slice 11 endpoint or field, per the plan's own resolution.
 *
 * UX-4: recolored per Deliverable 5 wireframes 6-8, on the same `.sp-page`
 * geometry discipline UX-3 applied to Learning Path/Module Detail/Class
 * Details (this screen had the identical independently-centered `:host`
 * pattern). PDF_LINK and EXTERNAL_LINK render distinctly (Finding 11): PDF
 * gets a "PDF document" caption, EXTERNAL_LINK gets its destination domain
 * (derived client-side from externalUrl, no new field) plus "Opens in a
 * new tab" microcopy, since it's the one link that leaves the app.
 */
@Component({
  selector: 'app-lesson-detail',
  standalone: true,
  host: { class: 'sp-page' },
  imports: [RouterLink, MatProgressSpinnerModule, MatIconModule, MatButtonModule, CurriculumMessageComponent, LessonBlockContentRendererComponent],
  styles: [`
    .lesson-content { max-width: 1050px; }
    .breadcrumb { display: flex; align-items: center; gap: 4px; font-size: 0.85rem; color: var(--sp-text-muted, #52596b); margin-bottom: 4px; }
    /* 44px touch-target floor (found undersized at 17px during 390px verification): the link text itself is small, so height comes from padding, not font-size. */
    .breadcrumb a { display: inline-flex; align-items: center; min-height: 44px; color: var(--sp-text-muted, #52596b); text-decoration: none; }
    .breadcrumb a:hover, .breadcrumb a:focus-visible { color: var(--sp-primary, #3d4ed8); outline: 2px solid var(--sp-primary, #3d4ed8); outline-offset: -2px; }
    .module-context { font-size: 0.8rem; color: var(--sp-text-muted, #52596b); margin: 0 0 10px; }
    h1 { font-size: 1.4rem; font-weight: 600; color: var(--sp-text, #1a1f36); margin: 0 0 16px; }
    .blocks-list { display: flex; flex-direction: column; gap: 20px; }
    .block-item { display: flex; flex-direction: column; gap: 6px; }
    .unavailable-block {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 10px; width: 100%; min-height: 240px; background: var(--sp-tone-neutral-bg, #f1f5f9); color: var(--sp-text-muted, #52596b); text-align: center; padding: 24px;
      box-sizing: border-box;
    }
    @media (max-width: 599px) {
      .unavailable-block { min-height: 160px; }
    }
    /* 44px touch-target floor (found undersized at 19.2px during verification-closure numerical layout checks): same fix pattern as the breadcrumb link above -- height comes from padding via inline-flex, not font-size. */
    .resource-caption { margin: 0; font-size: 0.8rem; color: var(--sp-text-muted, #52596b); }
    .practice-notes { margin-top: 20px; padding: 14px 16px; background: var(--sp-primary-bg, #eef0fb); border: 1px solid var(--sp-border-subtle, #edf0f7); border-radius: var(--sp-radius-sm, 8px); }
    .practice-notes p { margin: 0; color: var(--sp-text, #1a1f36); font-size: 0.9rem; }
    .nav-row { display: flex; justify-content: space-between; margin-top: 24px; }
    .nav-row button { min-height: 44px; }
  `],
  template: `
    <div class="lesson-content">
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

        @if (l.blocks.length === 0) {
          <div class="unavailable-block">
            <mat-icon aria-hidden="true" style="font-size:32px;width:32px;height:32px">info_outline</mat-icon>
            <p>This lesson's content isn't available right now.</p>
          </div>
        } @else {
          <div class="blocks-list">
            @for (b of l.blocks; track b.id) {
              <div class="block-item">
                <app-lesson-block-content-renderer [block]="b" />
                @if (b.contentType === 'PDF_LINK') {
                  <p class="resource-caption">PDF document</p>
                } @else if (b.contentType === 'EXTERNAL_LINK') {
                  <p class="resource-caption">@if (externalDomain(b)) { {{ externalDomain(b) }} &middot; } Opens in a new tab</p>
                }
              </div>
            }
          </div>
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
    </div>
  `
})
export class LessonDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(StudentLearningApiService);
  private destroyRef = inject(DestroyRef);

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

  /**
   * UX-4/Finding 11: derived client-side from the block's own
   * externalUrl -- no new field, matching the same "derive from what's
   * already there" pattern positionLabel() uses. `null` covers both "not
   * an external-link-shaped block" and a malformed URL -- either way the
   * template falls back to plain "Opens in a new tab" with no domain.
   */
  externalDomain(block: StudentContentBlock): string | null {
    if (!block.externalUrl) return null;
    try { return new URL(block.externalUrl).hostname; } catch { return null; }
  }

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
