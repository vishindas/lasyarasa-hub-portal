import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { StudentLearningLessonSummaryDTO } from '../../../core/models/student-learning.model';

/**
 * Part II.3's lesson list row. MC-4: simplified to a plain, always-
 * navigable row -- `StudentLearningLessonSummaryDTO` no longer carries
 * `contentType` or `videoAvailability` at all (architect decision: VIDEO
 * availability is block-level state now, shown only when the student
 * opens the lesson, never projected into this summary row; no aggregate
 * replacement field was introduced either). This also removes the MC-3
 * temporary non-navigable "Coming soon" state -- that guard existed only
 * because a block-native lesson wasn't yet consumable through this
 * endpoint; MC-4 makes every PUBLISHED lesson in this list fully
 * consumable, so every row is unconditionally navigable now. No
 * per-student completion state anywhere (correction 2, unchanged).
 */
@Component({
  selector: 'app-lesson-summary-row',
  standalone: true,
  imports: [RouterLink, MatIconModule],
  styles: [`
    a.row {
      display: flex; align-items: center; gap: 10px; min-height: 44px; padding: 10px 14px;
      border: 1px solid var(--sp-border-subtle, #edf0f7); border-radius: var(--sp-radius-sm, 8px);
      background: var(--sp-surface, #fff); text-decoration: none; color: var(--sp-text, #1a1f36);
    }
    a.row:hover, a.row:focus-visible { outline: 2px solid var(--sp-primary, #3d4ed8); outline-offset: -2px; }
    .title { flex: 1; }
  `],
  template: `
    <a class="row" [routerLink]="['lessons', lesson().lessonId]">
      <mat-icon aria-hidden="true">description</mat-icon>
      <span class="title">{{ lesson().title }}</span>
    </a>
  `
})
export class LessonSummaryRowComponent {
  lesson = input.required<StudentLearningLessonSummaryDTO>();
}
