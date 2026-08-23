import { Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AssignmentQuestionDTO } from '../data-access/assignment-staff.model';

const TYPE_LABEL: Record<string, string> = {
  SINGLE_CHOICE: 'Single choice', MULTIPLE_CHOICE: 'Multiple choice', SHORT_TEXT: 'Short text', LONG_TEXT: 'Long text'
};

@Component({
  selector: 'app-question-list-row',
  standalone: true,
  imports: [MatIconModule, MatButtonModule],
  styles: [`
    .row { display: flex; align-items: center; gap: 8px; padding: 10px 4px; border-bottom: 1px solid #eee; }
    .prompt { flex: 1; min-width: 0; }
    .type { color: #6c757d; font-size: 0.78rem; }
    button[mat-icon-button] { min-height: 44px; min-width: 44px; }
  `],
  template: `
    <div class="row">
      <div class="prompt">
        <div>{{ question().prompt }}</div>
        <div class="type">{{ typeLabel() }}@if (question().questionType === 'SINGLE_CHOICE' || question().questionType === 'MULTIPLE_CHOICE') { · {{ question().options.length }} options }</div>
      </div>
      <button mat-icon-button [disabled]="disabled() || position() === 0" (click)="moveUp.emit()" aria-label="Move question up">
        <mat-icon>arrow_upward</mat-icon>
      </button>
      <button mat-icon-button [disabled]="disabled() || position() === total() - 1" (click)="moveDown.emit()" aria-label="Move question down">
        <mat-icon>arrow_downward</mat-icon>
      </button>
      <button mat-icon-button [disabled]="disabled()" (click)="open.emit()" aria-label="Edit question">
        <mat-icon>edit</mat-icon>
      </button>
      <button mat-icon-button [disabled]="disabled()" (click)="remove.emit()" aria-label="Delete question">
        <mat-icon>delete</mat-icon>
      </button>
    </div>
  `
})
export class QuestionListRowComponent {
  question = input.required<AssignmentQuestionDTO>();
  position = input.required<number>();
  total = input.required<number>();
  disabled = input(false);

  open = output<void>();
  remove = output<void>();
  moveUp = output<void>();
  moveDown = output<void>();

  typeLabel(): string {
    return TYPE_LABEL[this.question().questionType] ?? this.question().questionType;
  }
}
