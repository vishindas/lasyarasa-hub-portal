import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { Lesson, ReorderLessonEntry, CurriculumVersion } from '../../../core/models/curriculum.model';
import { LessonApiService } from '../../../core/services/lesson-api.service';
import { CurriculumApiService } from '../../../core/services/curriculum-api.service';
import { ClassroomLiteModeService } from '../../../core/services/classroom-lite-mode.service';
import { CurriculumUiError, toCurriculumUiError } from '../../../core/services/curriculum-api-error.util';
import { ClassroomLiteBannerComponent } from '../../../shared/curriculum/classroom-lite-banner';
import { CurriculumMessageComponent } from '../../../shared/curriculum/curriculum-message';
import { FullOutageBlockComponent } from '../../../shared/curriculum/full-outage-block';
import { LessonListRowComponent } from './lesson-list-row';

/**
 * Figure 1 (Lesson List). Reached only from Module Detail's "Manage
 * Lessons" entry point (Slice 7 §3.1) -- no independent top-level nav item.
 * Reorder mirrors CurriculumBuilderComponent's drag+buttons dual-path
 * exactly (Slice 3 §6.1: "Drag is never the only way to reorder").
 */
@Component({
  selector: 'app-lesson-list',
  standalone: true,
  imports: [
    DragDropModule, MatButtonModule, MatIconModule, MatCardModule,
    ClassroomLiteBannerComponent, CurriculumMessageComponent, FullOutageBlockComponent, LessonListRowComponent
  ],
  styles: [`
    button[mat-flat-button], button[mat-stroked-button], button[mat-button] { min-height: 44px; }
    .lesson-list { display: flex; flex-direction: column; gap: 8px; }
  `],
  template: `
    <div class="page-header">
      <div style="display:flex;align-items:center;gap:6px">
        <button mat-icon-button (click)="close()" aria-label="Back to Module Detail">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <h2 style="margin:0">Lessons</h2>
      </div>
      @if (!mode.mutationsDisabled() && parentDraft()) {
        <button mat-flat-button color="primary" (click)="addLesson()">
          <mat-icon>add</mat-icon> Add Lesson
        </button>
      }
    </div>

    @if (mode.mode() === 'FULL_OUTAGE') {
      <app-full-outage-block />
    } @else {
      <app-classroom-lite-banner />

      @if (loading()) {
        <mat-card><mat-card-content style="padding:32px 0;text-align:center;color:#adb5bd">Loading…</mat-card-content></mat-card>
      } @else if (loadError()) {
        <app-curriculum-message [error]="loadError()" (retry)="load()" (reload)="load()" />
      } @else if (lessons().length === 0) {
        <mat-card>
          <mat-card-content style="padding:48px 24px;text-align:center">
            <p style="color:#6c757d;margin-bottom:16px">No lessons yet — add the first one.</p>
            @if (!mode.mutationsDisabled() && parentDraft()) {
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
              @for (l of lessons(); track l.id; let i = $index) {
                <div cdkDrag [cdkDragDisabled]="!canReorder() || l.lifecycleStatus === 'ARCHIVED'" [cdkDragData]="l">
                  <app-lesson-list-row
                    [lesson]="l" [position]="i" [total]="lessons().length" [disabled]="!canReorder() || l.lifecycleStatus === 'ARCHIVED'"
                    (open)="editLesson(l)" (preview)="previewLesson(l)"
                    (moveUp)="moveUp(i)" (moveDown)="moveDown(i)" />
                </div>
              }
            </div>
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
  private announcer = inject(LiveAnnouncer);
  mode = inject(ClassroomLiteModeService);

  curriculumId = signal<number | null>(null);
  versionId = signal<number | null>(null);
  moduleId = signal<number | null>(null);

  version = signal<CurriculumVersion | null>(null);
  lessons = signal<Lesson[]>([]);
  loading = signal(true);
  loadError = signal<CurriculumUiError | null>(null);
  actionError = signal<CurriculumUiError | null>(null);

  // The backend's own DRAFT-only trigger is the real authority; this only gates the UI.
  parentDraft = computed(() => this.version()?.status === 'DRAFT');
  canReorder = computed(() => this.parentDraft() && !this.mode.mutationsDisabled());

  ngOnInit() {
    this.curriculumId.set(Number(this.route.snapshot.paramMap.get('curriculumId')));
    this.versionId.set(Number(this.route.snapshot.paramMap.get('versionId')));
    this.moduleId.set(Number(this.route.snapshot.paramMap.get('moduleId')));
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
    this.lessonApi.list(mId).subscribe({
      next: lessons => { this.lessons.set([...lessons].sort((a, b) => a.lessonOrder - b.lessonOrder)); this.loading.set(false); },
      error: (err: HttpErrorResponse) => { this.loadError.set(toCurriculumUiError(err)); this.loading.set(false); }
    });
  }

  addLesson() {
    this.navigateToLessons('new');
  }

  editLesson(l: Lesson) {
    this.navigateToLessons(String(l.id), 'edit');
  }

  previewLesson(l: Lesson) {
    this.navigateToLessons(String(l.id), 'preview');
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

  close() {
    const cId = this.curriculumId(), vId = this.versionId(), mId = this.moduleId();
    this.router.navigate(['/vidya-rasa/curricula', cId, 'versions', vId, 'modules', mId]);
  }
}
