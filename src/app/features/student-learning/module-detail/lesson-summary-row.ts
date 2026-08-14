import { Component, input } from '@angular/core';
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
 */
@Component({
  selector: 'app-lesson-summary-row',
  standalone: true,
  imports: [RouterLink, MatIconModule],
  styles: [`
    a.row {
      display: flex; align-items: center; gap: 10px; min-height: 44px; padding: 10px 14px;
      border: 1px solid #E3DCC8; background: #fff; text-decoration: none; color: #1C1A16;
    }
    a.row:hover, a.row:focus-visible { outline: 2px solid #7A5419; outline-offset: -2px; }
    .title { flex: 1; }
    .unavailable-chip { font-size: 0.72rem; padding: 2px 8px; border-radius: 999px; background: #fee2e2; color: #991b1b; font-weight: 600; }
  `],
  template: `
    <a class="row" [routerLink]="['lessons', lesson().lessonId]">
      <mat-icon aria-hidden="true">{{ icon() }}</mat-icon>
      <span class="title">{{ lesson().title }}</span>
      @if (lesson().contentType === 'VIDEO' && lesson().videoAvailability === 'UNAVAILABLE') {
        <span class="unavailable-chip">Unavailable</span>
      }
    </a>
  `
})
export class LessonSummaryRowComponent {
  lesson = input.required<StudentLearningLessonSummaryDTO>();

  icon(): string {
    switch (this.lesson().contentType) {
      case 'VIDEO': return 'play_circle';
      case 'TEXT': return 'article';
      case 'PDF_LINK': return 'picture_as_pdf';
      case 'EXTERNAL_LINK': return 'link';
      default: return 'description';
    }
  }
}
