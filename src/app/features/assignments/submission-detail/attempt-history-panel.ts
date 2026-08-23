import { Component, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { StaffSubmissionAttemptHistoryEntryDTO, StaffSubmissionQuestionSnapshotDTO } from '../data-access/assignment-staff.model';

/**
 * T14 -- full immutable per-attempt response history, oldest first. Pinned
 * question/option snapshot (incl. staff-only isCorrect) is shared once at
 * the top level (questions input) rather than duplicated per attempt.
 */
@Component({
  selector: 'app-attempt-history-panel',
  standalone: true,
  imports: [DatePipe],
  styles: [`
    .attempt { border: 1px solid #eee; border-radius: 8px; padding: 12px 16px; margin-bottom: 12px; }
    .attempt-header { display: flex; justify-content: space-between; color: #6c757d; font-size: 0.82rem; margin-bottom: 8px; }
    .response { margin-bottom: 8px; }
    .prompt { font-weight: 600; }
    .correct { color: #065f46; }
    .incorrect { color: #b91c1c; }
    .outcome { font-size: 0.78rem; }
  `],
  template: `
    @for (attempt of attemptHistory(); track attempt.attemptId) {
      <div class="attempt">
        <div class="attempt-header">
          <span>Attempt {{ attempt.attemptNumber }} — submitted {{ attempt.submittedAt | date: 'medium' }}</span>
          @if (attempt.reviewDecision) {
            <span>{{ attempt.reviewDecision }} @if (attempt.reviewedAt) { on {{ attempt.reviewedAt | date: 'medium' }} }</span>
          }
        </div>
        @if (attempt.feedback) { <p><em>{{ attempt.feedback }}</em></p> }
        @for (r of attempt.responses; track r.questionId) {
          <div class="response">
            <div class="prompt">{{ questionPrompt(r.questionId) }}</div>
            @if (r.textResponse != null) {
              <div>{{ r.textResponse }}</div>
            } @else {
              @for (optId of r.selectedOptionIds; track optId) {
                <div [class.correct]="isCorrectOption(r.questionId, optId)">{{ optionLabel(r.questionId, optId) }}</div>
              }
            }
            @if (r.outcome) { <div class="outcome">{{ r.outcome }}</div> }
          </div>
        }
      </div>
    }
  `
})
export class AttemptHistoryPanelComponent {
  questions = input.required<StaffSubmissionQuestionSnapshotDTO[]>();
  attemptHistory = input.required<StaffSubmissionAttemptHistoryEntryDTO[]>();

  private question(questionId: number) {
    return this.questions().find(q => q.questionId === questionId);
  }

  questionPrompt(questionId: number): string {
    return this.question(questionId)?.prompt ?? '(question unavailable)';
  }

  optionLabel(questionId: number, optionId: number): string {
    return this.question(questionId)?.options.find(o => o.optionId === optionId)?.optionLabel ?? '(option unavailable)';
  }

  isCorrectOption(questionId: number, optionId: number): boolean {
    return this.question(questionId)?.options.find(o => o.optionId === optionId)?.isCorrect ?? false;
  }
}
