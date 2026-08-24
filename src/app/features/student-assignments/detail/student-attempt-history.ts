import { Component, input } from '@angular/core';
import { MatExpansionModule } from '@angular/material/expansion';
import { AttemptDTO, StudentAssignmentQuestionDTO } from '../data-access/student-assignment.model';
import { outcomeChip } from '../shared/student-assignment-status.util';

/**
 * Sub-component of S10 (SUBMITTED read-only) -- only ever rendered when
 * earlier (non-current) attempts exist, i.e. history.length > 1. Renders
 * every historical attempt's own actual response content, oldest first,
 * per the accepted plan's explicit requirement -- now real, since Slice
 * 14.2 widened AttemptDTO.responses with textResponse/selectedOptionIds.
 */
@Component({
  selector: 'app-student-attempt-history',
  standalone: true,
  imports: [MatExpansionModule],
  styles: [`
    :host { display: block; margin: 12px 0; }
    mat-expansion-panel { background: #F3EEDE !important; }
    .attempt-feedback { background: #fff8e1; border: 1px solid #E3DCC8; border-radius: 6px; padding: 8px 12px; margin: 8px 0; font-size: 0.85rem; }
    .q-row { padding: 10px 0; border-bottom: 1px solid #E3DCC8; }
    .q-row:last-child { border-bottom: none; }
    .q-prompt { font-weight: 600; margin: 0 0 4px; }
    .q-answer { color: #1C1A16; margin: 0; }
    .chip { display: inline-block; font-size: 0.72rem; font-weight: 600; padding: 2px 8px; border-radius: 12px; margin-left: 6px; }
    .tone-success { background: #e6f4ea; color: #1e4620; }
    .tone-error { background: #fdf1f1; color: #7a1f1f; }
    .tone-warning { background: #fff3cd; color: #7A5419; }
  `],
  template: `
    <mat-accordion multi>
      @for (attempt of pastAttempts(); track attempt.attemptNumber) {
        <mat-expansion-panel>
          <mat-expansion-panel-header>
            <mat-panel-title>Attempt {{ attempt.attemptNumber }}</mat-panel-title>
          </mat-expansion-panel-header>
          @if (attempt.feedback) {
            <div class="attempt-feedback">{{ attempt.feedback }}</div>
          }
          @for (q of questions(); track q.id) {
            <div class="q-row">
              <p class="q-prompt">{{ q.prompt }}</p>
              <p class="q-answer">
                {{ answerText(q, attempt) }}
                @if (outcomeFor(q, attempt); as o) {
                  <span class="chip tone-{{ o.tone }}">{{ o.label }}</span>
                }
              </p>
            </div>
          }
        </mat-expansion-panel>
      }
    </mat-accordion>
  `
})
export class StudentAttemptHistoryComponent {
  history = input.required<AttemptDTO[]>();
  questions = input.required<StudentAssignmentQuestionDTO[]>();
  currentAttemptNumber = input.required<number>();

  pastAttempts(): AttemptDTO[] {
    return this.history()
      .filter(a => a.attemptNumber < this.currentAttemptNumber())
      .sort((a, b) => a.attemptNumber - b.attemptNumber);
  }

  answerText(q: StudentAssignmentQuestionDTO, attempt: AttemptDTO): string {
    const r = attempt.responses.find(x => x.questionId === q.id);
    if (!r) return 'Not answered.';
    if (q.questionType === 'SINGLE_CHOICE' || q.questionType === 'MULTIPLE_CHOICE') {
      const labels = r.selectedOptionIds
        .map(id => q.options.find(o => o.id === id)?.optionLabel)
        .filter((l): l is string => !!l);
      return labels.length ? labels.join(', ') : 'Not answered.';
    }
    return r.textResponse ?? 'Not answered.';
  }

  outcomeFor(q: StudentAssignmentQuestionDTO, attempt: AttemptDTO) {
    const r = attempt.responses.find(x => x.questionId === q.id);
    return r ? outcomeChip(r.outcome) : null;
  }
}
