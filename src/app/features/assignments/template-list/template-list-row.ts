import { Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AssignmentTemplateSummaryDTO } from '../../../core/models/assignment.model';
import { StatusChipAssignmentComponent, AssignmentChipState } from '../../../shared/assignment/status-chip-assignment';

@Component({
  selector: 'app-template-list-row',
  standalone: true,
  imports: [MatIconModule, MatButtonModule, StatusChipAssignmentComponent],
  styles: [`
    .row { display: flex; align-items: center; justify-content: space-between; padding: 12px 4px; border-bottom: 1px solid #eee; gap: 12px; }
    .titles { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .titles .title { font-weight: 600; }
    .titles .sub { color: #6c757d; font-size: 0.82rem; }
  `],
  template: `
    <div class="row">
      <div class="titles">
        <span class="title">{{ template().draftTitle || template().publishedTitle || '(untitled)' }}</span>
        <span class="sub">{{ template().moduleTitle }} · {{ template().curriculumTitle }}</span>
      </div>
      <app-status-chip-assignment [state]="displayState()" />
      <button mat-stroked-button type="button" (click)="open.emit(template().id)">
        Open <mat-icon aria-hidden="true">arrow_forward</mat-icon>
      </button>
    </div>
  `
})
export class TemplateListRowComponent {
  template = input.required<AssignmentTemplateSummaryDTO>();
  open = output<number>();

  displayState(): AssignmentChipState {
    return this.template().displayStatus as AssignmentChipState;
  }
}
