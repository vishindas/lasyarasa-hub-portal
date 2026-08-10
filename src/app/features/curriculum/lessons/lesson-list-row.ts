import { Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Lesson } from '../../../core/models/curriculum.model';
import { StatusChipCurriculumComponent } from '../../../shared/curriculum/status-chip-curriculum';

const CONTENT_TYPE_LABEL: Record<Lesson['contentType'], string> = {
  VIDEO: 'Video', TEXT: 'Text', PDF_LINK: 'PDF Link', EXTERNAL_LINK: 'External Link'
};
const CONTENT_TYPE_ICON: Record<Lesson['contentType'], string> = {
  VIDEO: 'play_circle', TEXT: 'article', PDF_LINK: 'picture_as_pdf', EXTERNAL_LINK: 'link'
};

/**
 * One reorderable lesson row (Slice 7 Figure 1: "ordered lesson rows with
 * content-type and lifecycle chips, reorder buttons and guarded row
 * actions"). Mirrors ModuleListRowComponent's exact reorder-button/44px/
 * aria-label pattern; adds the content-type chip and the independent
 * video-unavailable indicator Slice 8's two-field lifecycle/availability
 * design requires (never folded into the lifecycle chip itself). Publish/
 * Unpublish/Archive row actions are added in Phase 3 alongside their
 * confirmation dialogs -- this component's Phase 1 scope is list, chips,
 * open, preview and reorder only.
 */
@Component({
  selector: 'app-lesson-list-row',
  standalone: true,
  imports: [MatIconModule, MatButtonModule, StatusChipCurriculumComponent],
  styles: [`
    button[mat-flat-button], button[mat-stroked-button], button[mat-button] { min-height: 44px; }
    .row {
      display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
      padding: 10px 8px; border-radius: 8px; min-height: 44px;
      border: 1px solid #edf0f7; background: #fff;
    }
    .drag-handle { color: #adb5bd; cursor: grab; touch-action: none; }
    .title-btn {
      flex: 1; min-width: 160px; text-align: left; background: none; border: none; cursor: pointer;
      font-size: 0.88rem; font-weight: 500; color: #1a1f36; white-space: normal;
      padding: 6px 4px; min-height: 44px; display: flex; align-items: center; gap: 6px;
    }
    .title-btn:focus-visible { outline: 2px solid #4f63d2; outline-offset: 2px; }
    .type-icon { font-size: 18px; width: 18px; height: 18px; color: #6c757d; flex-shrink: 0; }
    .chips { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .unavailable-badge {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 3px 10px 3px 8px; border-radius: 20px; font-size: 0.72rem; font-weight: 600;
      background: #fef3c7; color: #92400e;
    }
    .unavailable-badge mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .order-buttons { display: flex; flex-direction: column; }
    .order-buttons button.mat-mdc-icon-button { width: 44px; height: 44px; padding: 10px; }
    @media (max-width: 767px) { .row { flex-wrap: wrap; } }
  `],
  template: `
    <div class="row">
      @if (!disabled()) {
        <mat-icon class="drag-handle" aria-hidden="true">drag_indicator</mat-icon>
      }
      <button type="button" class="title-btn" (click)="open.emit()">
        <mat-icon class="type-icon" aria-hidden="true">{{ typeIcon() }}</mat-icon>
        {{ lesson().title }}
      </button>
      <div class="chips">
        <span class="chip-label" style="font-size:0.72rem;color:#6c757d">{{ typeLabel() }}</span>
        <app-status-chip-curriculum [state]="lesson().lifecycleStatus" />
        @if (lesson().contentType === 'VIDEO' && lesson().videoAvailability === 'UNAVAILABLE') {
          <span class="unavailable-badge">
            <mat-icon aria-hidden="true">warning</mat-icon>
            Video unavailable
          </span>
        }
      </div>
      <button mat-button type="button" (click)="preview.emit()">Preview</button>
      @if (!disabled()) {
        <div class="order-buttons">
          <button mat-icon-button type="button" [attr.aria-label]="'Move ' + lesson().title + ' up'"
                  [disabled]="position() === 0" (click)="moveUp.emit()">
            <mat-icon aria-hidden="true">keyboard_arrow_up</mat-icon>
          </button>
          <button mat-icon-button type="button" [attr.aria-label]="'Move ' + lesson().title + ' down'"
                  [disabled]="position() === total() - 1" (click)="moveDown.emit()">
            <mat-icon aria-hidden="true">keyboard_arrow_down</mat-icon>
          </button>
        </div>
      }
    </div>
  `
})
export class LessonListRowComponent {
  lesson = input.required<Lesson>();
  position = input.required<number>();
  total = input.required<number>();
  disabled = input(false);

  open = output<void>();
  preview = output<void>();
  moveUp = output<void>();
  moveDown = output<void>();

  typeLabel(): string { return CONTENT_TYPE_LABEL[this.lesson().contentType]; }
  typeIcon(): string { return CONTENT_TYPE_ICON[this.lesson().contentType]; }
}
