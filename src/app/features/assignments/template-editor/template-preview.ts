import { Component, input } from '@angular/core';
import { AssignmentQuestionDTO } from '../data-access/assignment-staff.model';

/**
 * T7 -- an actual, distinguishable preview surface: renders all 4 question
 * types read-only (no CRUD/reorder controls of any kind), client-side from
 * the already-fetched version graph -- no new network call. Staff
 * answer-key presentation (isCorrect) is preserved exactly as in the
 * authoring list, since this is still a features/assignments/** surface,
 * never a student-facing one.
 */
@Component({
  selector: 'app-template-preview',
  standalone: true,
  imports: [],
  styles: [`
    .question { border: 1px solid #eee; border-radius: 8px; padding: 14px 16px; margin-bottom: 12px; }
    .prompt { font-weight: 600; margin-bottom: 8px; }
    .type-label { color: #6c757d; font-size: 0.78rem; margin-bottom: 8px; }
    .option { display: flex; align-items: center; gap: 8px; padding: 4px 0; }
    .option.correct { color: #065f46; font-weight: 600; }
    .option .marker { width: 16px; text-align: center; }
    textarea, input.text-answer { width: 100%; max-width: 480px; }
  `],
  template: `
    @for (q of questions(); track q.id) {
      <div class="question">
        <div class="type-label">{{ typeLabel(q.questionType) }}</div>
        <div class="prompt">{{ q.questionOrder }}. {{ q.prompt }}</div>

        @if (q.questionType === 'SINGLE_CHOICE' || q.questionType === 'MULTIPLE_CHOICE') {
          @for (o of q.options; track o.id) {
            <div class="option" [class.correct]="o.isCorrect">
              <span class="marker">{{ q.questionType === 'SINGLE_CHOICE' ? '◯' : '☐' }}</span>
              <span>{{ o.optionLabel }}</span>
              @if (o.isCorrect) { <span>(correct)</span> }
            </div>
          }
          @if (q.questionType === 'MULTIPLE_CHOICE' && q.maxSelections != null) {
            <p class="type-label">Select up to {{ q.maxSelections }}.</p>
          }
        } @else if (q.questionType === 'SHORT_TEXT') {
          <input class="text-answer" type="text" disabled placeholder="Student's short-text answer" />
        } @else if (q.questionType === 'LONG_TEXT') {
          <textarea class="text-answer" rows="3" disabled placeholder="Student's long-text answer"></textarea>
        }
      </div>
    } @empty {
      <p style="color:#adb5bd">No questions to preview yet.</p>
    }
  `
})
export class TemplatePreviewComponent {
  questions = input.required<AssignmentQuestionDTO[]>();

  typeLabel(type: string): string {
    switch (type) {
      case 'SINGLE_CHOICE': return 'Single choice';
      case 'MULTIPLE_CHOICE': return 'Multiple choice';
      case 'SHORT_TEXT': return 'Short text';
      case 'LONG_TEXT': return 'Long text';
      default: return type;
    }
  }
}
