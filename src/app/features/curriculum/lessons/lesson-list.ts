import { Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { Lesson, ReorderLessonEntry, CurriculumVersion, CurriculumModule } from '../../../core/models/curriculum.model';
import { AssignmentTemplateSummaryDTO } from '../../../core/models/assignment.model';
import { LessonApiService } from '../../../core/services/lesson-api.service';
import { CurriculumApiService } from '../../../core/services/curriculum-api.service';
import { CurriculumModuleApiService } from '../../../core/services/curriculum-module-api.service';
import { AssignmentTemplateApiService } from '../../../core/services/assignment-template-api.service';
import { AssignmentCapabilityStateService } from '../../../core/services/assignment-capability-state.service';
import { ClassroomLiteModeService } from '../../../core/services/classroom-lite-mode.service';
import { CurriculumUiError, toCurriculumUiError } from '../../../core/services/curriculum-api-error.util';
import { ClassroomLiteBannerComponent } from '../../../shared/curriculum/classroom-lite-banner';
import { CurriculumMessageComponent } from '../../../shared/curriculum/curriculum-message';
import { FullOutageBlockComponent } from '../../../shared/curriculum/full-outage-block';
import { LessonListRowComponent } from './lesson-list-row';

const PUBLISHED_DISPLAY_STATUSES = new Set(['PUBLISHED', 'PUBLISHED_WITH_DRAFT']);

/**
 * Figure 1 (Lesson List). Reached from Module Detail's "Manage Lessons"
 * entry point (Slice 7 §3.1) in its normal editing mode, or from Curriculum
 * Preview's published-module link (Issue #54) in read-only previewMode --
 * see curricula.routes.ts's `lessons/preview` route, which sets
 * `data: { previewMode: true }`. previewMode is the ONLY thing that
 * distinguishes the two: same component, same data source
 * (LessonApiService.list), never a parallel preview model. In previewMode,
 * `visibleLessons()` filters to PUBLISHED only (a teacher previewing "what
 * a student will see" should never see a draft), Add/Edit/reorder are all
 * disabled (this screen makes no mutation calls in previewMode, matching
 * CurriculumPreviewComponent's own read-only contract one level up), and
 * both the title button and the Preview button route into the read-only
 * LessonPreviewComponent -- never the editor -- carrying `?from=preview` so
 * that screen's own Back/Previous/Next navigation stays inside the preview
 * flow instead of dropping the teacher into the ordinary edit list (see
 * LessonPreviewComponent's own fromPreview() handling).
 *
 * Reorder mirrors CurriculumBuilderComponent's drag+buttons dual-path
 * exactly (Slice 3 §6.1: "Drag is never the only way to reorder").
 *
 * Issue #56: previewMode also shows a "Related Assignments" section after
 * the lesson list -- the module's PUBLISHED (or PUBLISHED_WITH_DRAFT)
 * assignment templates, sourced only from AssignmentTemplateApiService
 * (the answer-key-free 8-endpoint wrapper; never
 * features/assignments/data-access/**), hidden entirely whenever
 * AssignmentCapabilityStateService.enabled() is false -- no request is even
 * made in that case (see the constructor's effect()). Each title routes
 * into a new, dedicated read-only preview route
 * (modules/:moduleId/assignments/:templateId/preview -> a brand-new
 * CurriculumAssignmentPreviewComponent, never TemplatePreviewComponent).
 * No assignment_instance is ever created by any of this -- GET-only, same
 * as the rest of this screen's previewMode contract.
 */
@Component({
  selector: 'app-lesson-list',
  standalone: true,
  imports: [
    RouterLink, DragDropModule, MatButtonModule, MatIconModule, MatCardModule,
    ClassroomLiteBannerComponent, CurriculumMessageComponent, FullOutageBlockComponent, LessonListRowComponent
  ],
  styles: [`
    button[mat-flat-button], button[mat-stroked-button], button[mat-button] { min-height: 44px; }
    .lesson-list { display: flex; flex-direction: column; gap: 8px; }
    .preview-banner {
      display: flex; align-items: center; gap: 8px;
      background: #eef2ff; color: #3730a3; border: 1px solid #c7d2fe;
      padding: 10px 16px; border-radius: 8px; margin-bottom: 16px; font-size: 0.85rem; font-weight: 500;
    }
    .section-header { margin: 20px 0 8px; }
    .section-header h3 { margin: 0; }
    .assignment-row {
      display: flex; align-items: center; padding: 10px 4px; border-bottom: 1px solid #f1f3f5; min-height: 44px;
    }
    .assignment-row:last-child { border-bottom: none; }
    .assignment-link {
      color: #3730a3; text-decoration: none; font-size: 0.9rem; font-weight: 500;
      display: flex; align-items: center; gap: 8px; min-height: 44px;
    }
    .assignment-link:hover { text-decoration: underline; }
    .assignment-link:focus-visible { outline: 2px solid #4f63d2; outline-offset: 2px; border-radius: 2px; }
  `],
  template: `
    <div class="page-header">
      <div style="display:flex;align-items:center;gap:6px">
        <button mat-icon-button (click)="close()" [attr.aria-label]="previewMode() ? 'Back to Curriculum Preview' : 'Back to Module Detail'">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <h2 style="margin:0">Lessons</h2>
      </div>
      @if (!mode.mutationsDisabled() && canAddLesson()) {
        <button mat-flat-button color="primary" (click)="addLesson()">
          <mat-icon>add</mat-icon> Add Lesson
        </button>
      }
    </div>

    @if (previewMode()) {
      <div class="preview-banner" role="status">
        <mat-icon aria-hidden="true">visibility</mat-icon>
        <span>Preview mode — showing published lessons only. Nothing here is released to students.</span>
      </div>
    }

    @if (moduleArchived()) {
      <p class="readonly-note" style="color:#6c757d;font-size:0.82rem;margin:0 0 12px">This module is archived — its lessons are read-only.</p>
    }

    @if (mode.mode() === 'FULL_OUTAGE') {
      <app-full-outage-block />
    } @else {
      <app-classroom-lite-banner />

      @if (loading()) {
        <mat-card><mat-card-content style="padding:32px 0;text-align:center;color:#adb5bd">Loading…</mat-card-content></mat-card>
      } @else if (loadError()) {
        <app-curriculum-message [error]="loadError()" (retry)="load()" (reload)="load()" />
      } @else if (visibleLessons().length === 0) {
        <mat-card>
          <mat-card-content style="padding:48px 24px;text-align:center">
            <p style="color:#6c757d;margin-bottom:16px">{{ previewMode() ? 'No published lessons yet.' : 'No lessons yet — add the first one.' }}</p>
            @if (!mode.mutationsDisabled() && canAddLesson()) {
              <button mat-flat-button color="primary" (click)="addLesson()">
                <mat-icon>add</mat-icon> Add Lesson
              </button>
            }
          </mat-card-content>
        </mat-card>
      } @else {
        <app-curriculum-message [error]="actionError()" (reload)="load()" />
        <mat-card>
          <mat-card-content style="padding:8px 16px">
            <div class="lesson-list" cdkDropList (cdkDropListDropped)="onDrop($event)">
              @for (l of visibleLessons(); track l.id; let i = $index) {
                <div cdkDrag [cdkDragDisabled]="!canReorder() || l.lifecycleStatus === 'ARCHIVED'" [cdkDragData]="l">
                  <app-lesson-list-row
                    [lesson]="l" [position]="i" [total]="visibleLessons().length" [disabled]="!canReorder() || l.lifecycleStatus === 'ARCHIVED'"
                    (open)="editLesson(l)" (preview)="previewLesson(l)"
                    (moveUp)="moveUp(i)" (moveDown)="moveDown(i)" />
                </div>
              }
            </div>
          </mat-card-content>
        </mat-card>
      }

      @if (previewMode() && capabilityState.enabled() && (relatedAssignmentsLoading() || relatedAssignmentsError() || relatedAssignments().length > 0)) {
        <div class="section-header"><h3>Related Assignments</h3></div>
        <mat-card>
          <mat-card-content style="padding:8px 16px">
            @if (relatedAssignmentsError()) {
              <app-curriculum-message [error]="relatedAssignmentsError()" (retry)="retryRelatedAssignments()" />
            } @else if (relatedAssignmentsLoading()) {
              <p style="color:#adb5bd;text-align:center;padding:12px 0;margin:0">Loading…</p>
            } @else {
              @for (t of relatedAssignments(); track t.id) {
                <div class="assignment-row">
                  <a class="assignment-link" [routerLink]="assignmentPreviewLink(t)" [attr.aria-label]="'Preview assignment: ' + t.publishedTitle">
                    <mat-icon aria-hidden="true">assignment</mat-icon>
                    {{ t.publishedTitle }}
                  </a>
                </div>
              }
            }
          </mat-card-content>
        </mat-card>
      }
    }
  `
})
export class LessonListComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private lessonApi = inject(LessonApiService);
  private curriculumApi = inject(CurriculumApiService);
  private moduleApi = inject(CurriculumModuleApiService);
  private templateApi = inject(AssignmentTemplateApiService);
  private announcer = inject(LiveAnnouncer);
  mode = inject(ClassroomLiteModeService);
  capabilityState = inject(AssignmentCapabilityStateService);

  curriculumId = signal<number | null>(null);
  versionId = signal<number | null>(null);
  moduleId = signal<number | null>(null);
  /** Issue #54: set once, from route data, at load time -- never changes for this component's lifetime. */
  previewMode = signal(false);

  version = signal<CurriculumVersion | null>(null);
  module = signal<CurriculumModule | null>(null);
  lessons = signal<Lesson[]>([]);
  loading = signal(true);
  loadError = signal<CurriculumUiError | null>(null);
  actionError = signal<CurriculumUiError | null>(null);

  /** Issue #54: what's actually rendered -- published-only in previewMode, everything otherwise. Never mutates `lessons()` itself, so a later exit from previewMode (there isn't one today, but nothing here assumes it) would see the full list again. */
  visibleLessons = computed(() => this.previewMode()
    ? this.lessons().filter(l => l.lifecycleStatus === 'PUBLISHED')
    : this.lessons());

  // The backend's own DRAFT-only trigger is the real authority; this only gates the UI.
  parentDraft = computed(() => this.version()?.status === 'DRAFT');
  /**
   * CURR-FUNC-06: fails closed by construction -- `module` stays `null`
   * until a successful fetch resolves it, so a load failure (network error,
   * not-found) never lets this default to "writable". Only an explicitly
   * confirmed non-ARCHIVED module makes this true.
   */
  moduleArchived = computed(() => this.module()?.contentStatus === 'ARCHIVED');
  private moduleConfirmedWritable = computed(() => this.module() !== null && this.module()!.contentStatus !== 'ARCHIVED');
  // Issue #54: previewMode makes no mutation calls at all, matching CurriculumPreviewComponent's own read-only contract one level up.
  canAddLesson = computed(() => !this.previewMode() && this.parentDraft() && this.moduleConfirmedWritable());
  canReorder = computed(() => !this.previewMode() && this.parentDraft() && this.moduleConfirmedWritable() && !this.mode.mutationsDisabled());

  /** Issue #56 -- PUBLISHED/PUBLISHED_WITH_DRAFT assignment templates for this module. Empty until fetched; fetched at most once, only in previewMode, only once capability resolves enabled (see constructor). */
  relatedAssignments = signal<AssignmentTemplateSummaryDTO[]>([]);
  relatedAssignmentsLoading = signal(false);
  /**
   * Architect correction: a failed request must never be silently converted
   * into an empty list -- that would make a real API/network/backend
   * failure indistinguishable from "no published assignment," recreating
   * the original defect this section exists to fix. `relatedAssignments`
   * therefore stays untouched on failure; the section instead renders this
   * scoped, generic error with a Retry action (never the raw backend error).
   */
  relatedAssignmentsError = signal<CurriculumUiError | null>(null);
  private relatedAssignmentsFetched = false;

  constructor() {
    // Issue #56: capability state resolves asynchronously (it's shared, app-wide, refreshed by ShellComponent at login) --
    // this effect fires the templates fetch the moment it's both previewMode and confirmed enabled, and never before,
    // so a disabled (or not-yet-resolved) capability makes no request at all, matching this section's own hidden-when-disabled contract.
    effect(() => {
      if (this.previewMode() && this.capabilityState.enabled() && !this.relatedAssignmentsFetched) {
        this.relatedAssignmentsFetched = true;
        this.loadRelatedAssignments();
      }
    });
  }

  ngOnInit() {
    this.curriculumId.set(Number(this.route.snapshot.paramMap.get('curriculumId')));
    this.versionId.set(Number(this.route.snapshot.paramMap.get('versionId')));
    this.moduleId.set(Number(this.route.snapshot.paramMap.get('moduleId')));
    this.previewMode.set(this.route.snapshot.data['previewMode'] === true);
    this.load();
  }

  private loadRelatedAssignments() {
    const mId = this.moduleId();
    if (mId === null) return;
    this.relatedAssignmentsLoading.set(true);
    this.relatedAssignmentsError.set(null);
    this.templateApi.list(mId, 0, 50).subscribe({
      next: page => {
        this.relatedAssignments.set(page.content.filter(t => PUBLISHED_DISPLAY_STATUSES.has(t.displayStatus)));
        this.relatedAssignmentsLoading.set(false);
      },
      error: () => {
        this.relatedAssignmentsLoading.set(false);
        this.relatedAssignmentsError.set({ kind: 'unknown', message: "Related assignments couldn't be loaded", resource: null });
      }
    });
  }

  /** Issue #56 architect correction: retry is a deliberate user action -- it always issues a fresh GET, bypassing the one-time fetch guard the initial automatic load uses. */
  retryRelatedAssignments() {
    this.loadRelatedAssignments();
  }

  assignmentPreviewLink(t: AssignmentTemplateSummaryDTO): (string | number)[] {
    return ['/vidya-rasa/curricula', this.curriculumId()!, 'versions', this.versionId()!, 'modules', this.moduleId()!, 'assignments', t.id, 'preview'];
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
    // already uses. A failed/empty resolution leaves `module` null, which
    // canAddLesson()/canReorder() treat as not-writable (fail closed).
    this.moduleApi.list(vId).subscribe({
      next: modules => this.module.set(modules.find(m => m.id === mId) ?? null),
      error: () => this.module.set(null)
    });
    this.lessonApi.list(mId).subscribe({
      next: lessons => { this.lessons.set([...lessons].sort((a, b) => a.lessonOrder - b.lessonOrder)); this.loading.set(false); },
      error: (err: HttpErrorResponse) => { this.loadError.set(toCurriculumUiError(err)); this.loading.set(false); }
    });
  }

  addLesson() {
    this.navigateToLessons('new');
  }

  /** Issue #54: in previewMode there is no edit path -- the title button routes into the same read-only preview as the Preview button. */
  editLesson(l: Lesson) {
    if (this.previewMode()) { this.previewLesson(l); return; }
    this.navigateToLessons(String(l.id), 'edit');
  }

  previewLesson(l: Lesson) {
    const cId = this.curriculumId(), vId = this.versionId(), mId = this.moduleId();
    const extras = this.previewMode() ? { queryParams: { from: 'preview' } } : {};
    this.router.navigate(['/vidya-rasa/curricula', cId, 'versions', vId, 'modules', mId, 'lessons', l.id, 'preview'], extras);
  }

  private navigateToLessons(...segments: string[]) {
    const cId = this.curriculumId(), vId = this.versionId(), mId = this.moduleId();
    this.router.navigate(['/vidya-rasa/curricula', cId, 'versions', vId, 'modules', mId, 'lessons', ...segments]);
  }

  /**
   * CURR-FUNC-05 review correction: dragging a non-archived lesson across an
   * archived one previously shifted the archived lesson's own array index
   * (and therefore its computed lessonOrder), which the backend correctly
   * rejects -- but that meant a perfectly valid reorder of the surrounding
   * active lessons could fail outright. ARCHIVED lessons are now fixed
   * positional anchors: CDK is still allowed to report whatever raw
   * previousIndex/currentIndex it wants over the full visual list (including
   * the archived row, which simply can't be picked up itself -- see
   * cdkDragDisabled below), but the archived row's position in that raw,
   * intermediate array is never trusted. Only the *relative order of the
   * active lessons* within it reflects the user's real intent; buildFixedAnchorEntries()
   * then reassigns that relative order onto the module's remaining
   * (non-archived) position slots, leaving every archived lesson's own
   * lessonOrder completely untouched and never named in the request.
   */
  onDrop(event: CdkDragDrop<Lesson[]>) {
    // CURR-FUNC-06: defense-in-depth -- CDK drag is never enabled while canReorder() is false, but this guards against any stale-DOM/programmatic path reaching here anyway.
    if (!this.canReorder()) return;
    if (event.previousIndex === event.currentIndex) return;
    const movedLesson = this.lessons()[event.previousIndex];
    const fullReordered = [...this.lessons()];
    moveItemInArray(fullReordered, event.previousIndex, event.currentIndex);
    const newActiveOrder = fullReordered.filter(l => l.lifecycleStatus !== 'ARCHIVED');
    this.applyFixedAnchorReorder(newActiveOrder, movedLesson.title);
  }

  /**
   * i indexes the full lessons() array (matching the template's $index).
   * Moves this lesson one step earlier among the ACTIVE lessons only --
   * skipping over any archived lesson in between, exactly like moving it
   * past a fixed obstacle, rather than refusing the move outright.
   */
  moveUp(i: number) {
    if (!this.canReorder()) return; // CURR-FUNC-06: defense-in-depth, same rationale as onDrop above
    const all = this.lessons();
    const lesson = all[i];
    if (lesson.lifecycleStatus === 'ARCHIVED') return; // defensive -- archived rows render no move button anyway
    const active = all.filter(l => l.lifecycleStatus !== 'ARCHIVED');
    const activeIdx = active.findIndex(l => l.id === lesson.id);
    if (activeIdx <= 0) return; // already first among active lessons -- nothing to do
    const reorderedActive = [...active];
    [reorderedActive[activeIdx - 1], reorderedActive[activeIdx]] = [reorderedActive[activeIdx], reorderedActive[activeIdx - 1]];
    this.applyFixedAnchorReorder(reorderedActive, lesson.title);
  }

  moveDown(i: number) {
    if (!this.canReorder()) return; // CURR-FUNC-06: defense-in-depth, same rationale as onDrop above
    const all = this.lessons();
    const lesson = all[i];
    if (lesson.lifecycleStatus === 'ARCHIVED') return;
    const active = all.filter(l => l.lifecycleStatus !== 'ARCHIVED');
    const activeIdx = active.findIndex(l => l.id === lesson.id);
    if (activeIdx === -1 || activeIdx >= active.length - 1) return; // already last among active lessons
    const reorderedActive = [...active];
    [reorderedActive[activeIdx], reorderedActive[activeIdx + 1]] = [reorderedActive[activeIdx + 1], reorderedActive[activeIdx]];
    this.applyFixedAnchorReorder(reorderedActive, lesson.title);
  }

  /**
   * Archived lessons keep their exact current lessonOrder (the module's
   * "fixed anchor" positions). The given active lessons -- in their new
   * desired relative order -- are assigned to the remaining position slots,
   * in order. Only entries whose position actually changed are returned;
   * an archived lesson can never appear here, since this only ever iterates
   * over the active subset.
   */
  private buildFixedAnchorEntries(newActiveOrder: Lesson[]): ReorderLessonEntry[] {
    const all = this.lessons();
    const archivedPositions = new Set(all.filter(l => l.lifecycleStatus === 'ARCHIVED').map(l => l.lessonOrder));
    const availablePositions = Array.from({ length: all.length }, (_, idx) => idx + 1)
      .filter(pos => !archivedPositions.has(pos));

    const entries: ReorderLessonEntry[] = [];
    newActiveOrder.forEach((lesson, idx) => {
      const newOrder = availablePositions[idx];
      if (lesson.lessonOrder !== newOrder) entries.push({ lessonId: lesson.id, expectedRowVersion: lesson.rowVersion, newOrder });
    });
    return entries;
  }

  private applyFixedAnchorReorder(newActiveOrder: Lesson[], movedTitle: string) {
    const mId = this.moduleId();
    if (mId === null) return;
    const entries = this.buildFixedAnchorEntries(newActiveOrder);
    if (entries.length === 0) return; // no-op or an impossible move (e.g. already first/last) -- nothing to send
    this.lessonApi.reorder(mId, { entries }).subscribe({
      next: lessons => {
        const sorted = [...lessons].sort((a, b) => a.lessonOrder - b.lessonOrder);
        this.lessons.set(sorted);
        const newPos = sorted.findIndex(l => l.title === movedTitle) + 1;
        this.announcer.announce(`${movedTitle} moved to position ${newPos} of ${sorted.length}`);
      },
      error: (err: HttpErrorResponse) => {
        const e = toCurriculumUiError(err);
        // Action-specific stale-conflict copy (Slice 9 binding decision 1).
        if (e.kind === 'conflict') e.message = 'Lesson order changed elsewhere — reload before reordering';
        this.actionError.set(e);
      }
    });
  }

  /** Issue #54: previewMode returns through the preview flow (Curriculum Preview), never into Module Detail's edit view. */
  close() {
    const cId = this.curriculumId(), vId = this.versionId(), mId = this.moduleId();
    if (this.previewMode()) {
      this.router.navigate(['/vidya-rasa/curricula', cId, 'versions', vId, 'preview']);
      return;
    }
    this.router.navigate(['/vidya-rasa/curricula', cId, 'versions', vId, 'modules', mId]);
  }
}
