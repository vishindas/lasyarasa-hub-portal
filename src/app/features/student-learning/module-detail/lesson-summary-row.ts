import { Component, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { StudentLearningLessonSummaryDTO } from '../../../core/models/student-learning.model';

/**
 * Part II.3's lesson list row -- content-type icon + title, an
 * "Unavailable" chip for a VIDEO lesson whose videoAvailability is
 * UNAVAILABLE, but the row itself stays fully visible and clickable
 * (video problems are a playback-time concern, matching the accepted
 * Slice 7/9 decision -- never hidden or blocked at this level). No
 * per-student completion state anywhere (correction 2).
 *
 * MC-3: `contentType == null` means this lesson is block-native
 * (lesson_content_blocks is its canonical content) -- student block-aware
 * reads/rendering are MC-4 scope, not yet built, so
 * `getLessonDetail`/`toLessonSummary` on the backend already keep a
 * null-content lesson out of the "normally clickable" path here too
 * (see StudentLearningReadService). Until MC-4 lands, such a lesson
 * renders as the established non-navigable "not available yet" row --
 * same treatment ModuleSummaryRowComponent already gives a LOCKED module
 * ("Coming soon" chip, no RouterLink, inline note on activation) -- never
 * a crash, never an invented content type.
 */
@Component({
  selector: 'app-lesson-summary-row',
  standalone: true,
  imports: [RouterLink, MatIconModule],
  styles: [`
    :host { display: block; }
    .row {
      display: flex; align-items: center; gap: 10px; min-height: 44px; padding: 10px 14px;
      border: 1px solid var(--sp-border-subtle, #edf0f7); border-radius: var(--sp-radius-sm, 8px);
      background: var(--sp-surface, #fff); text-decoration: none; color: var(--sp-text, #1a1f36);
    }
    a.row:hover, a.row:focus-visible { outline: 2px solid var(--sp-primary, #3d4ed8); outline-offset: -2px; }
    .row.pending { background: var(--sp-tone-neutral-bg, #f1f5f9); color: var(--sp-text-muted, #52596b); cursor: pointer; }
    .title { flex: 1; }
    /* UX-3: recolored onto the shared negative tone (styles-student.scss) --
       same tone module-summary-row.ts now uses for WITHDRAWN. */
    .unavailable-chip { font-size: 0.72rem; padding: 2px 8px; border-radius: 999px; background: var(--sp-tone-negative-bg, #fee2e2); color: var(--sp-tone-negative-text, #991b1b); font-weight: 600; }
    .pending-chip { font-size: 0.72rem; padding: 2px 8px; border-radius: 999px; background: var(--sp-tone-neutral-bg, #f1f5f9); color: var(--sp-tone-neutral-text, #64748b); font-weight: 600; }
    .inline-note { font-size: 0.8rem; color: var(--sp-text-muted, #52596b); margin: 4px 0 0; }
  `],
  template: `
    @if (lesson().contentType !== undefined) {
      <a class="row" [routerLink]="['lessons', lesson().lessonId]">
        <mat-icon aria-hidden="true">{{ icon() }}</mat-icon>
        <span class="title">{{ lesson().title }}</span>
        @if (lesson().contentType === 'VIDEO' && lesson().videoAvailability === 'UNAVAILABLE') {
          <span class="unavailable-chip">Unavailable</span>
        }
      </a>
    } @else {
      <div class="row pending" tabindex="0" role="button" [attr.aria-label]="lesson().title" (click)="onActivatePending()" (keydown.enter)="onActivatePending()" (keydown.space)="onActivatePending()">
        <mat-icon aria-hidden="true">hourglass_empty</mat-icon>
        <span class="title">{{ lesson().title }}</span>
        <span class="pending-chip">Coming soon</span>
      </div>
      @if (showPendingNote()) {
        <p class="inline-note">This lesson isn't available to view yet.</p>
      }
    }
  `
})
export class LessonSummaryRowComponent {
  lesson = input.required<StudentLearningLessonSummaryDTO>();

  showPendingNote = signal(false);

  icon(): string {
    switch (this.lesson().contentType) {
      case 'VIDEO': return 'play_circle';
      case 'TEXT': return 'article';
      case 'PDF_LINK': return 'picture_as_pdf';
      case 'EXTERNAL_LINK': return 'link';
      default: return 'description';
    }
  }

  onActivatePending(): void {
    this.showPendingNote.set(true);
  }
}
