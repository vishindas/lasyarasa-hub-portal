import { Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { CurriculumModule } from '../../../core/models/curriculum.model';
import { StatusChipCurriculumComponent } from '../../../shared/curriculum/status-chip-curriculum';

/**
 * One reorderable module row. Drag is never the only way to reorder (Slice
 * 3 §6.1): the ↑/↓ buttons are the real, focusable, 44x44px keyboard/
 * switch-accessible alternative, each carrying an accessible name including
 * the module title. The drag handle here is presentational only -- the
 * actual cdkDrag/cdkDropList wiring lives in the parent (CurriculumBuilder)
 * since drop-list reordering is a list-level concern.
 */
@Component({
  selector: 'app-module-list-row',
  standalone: true,
  imports: [MatIconModule, MatButtonModule, StatusChipCurriculumComponent],
  styles: [`
    .row {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 8px; border-radius: 8px; min-height: 44px;
      border: 1px solid #edf0f7; background: #fff;
    }
    .drag-handle { color: #adb5bd; cursor: grab; touch-action: none; }
    .title-btn {
      flex: 1; text-align: left; background: none; border: none; cursor: pointer;
      font-size: 0.88rem; font-weight: 500; color: #1a1f36; white-space: normal;
      padding: 6px 4px; min-height: 44px;
    }
    .title-btn:focus-visible { outline: 2px solid #4f63d2; outline-offset: 2px; }
    .order-buttons { display: flex; flex-direction: column; }
    .order-buttons button.mat-mdc-icon-button { width: 44px; height: 44px; padding: 10px; }
    @media (max-width: 767px) { .row { flex-wrap: wrap; } }
  `],
  template: `
    <div class="row">
      @if (!disabled()) {
        <mat-icon class="drag-handle" aria-hidden="true">drag_indicator</mat-icon>
      }
      <button type="button" class="title-btn" (click)="open.emit()">{{ module().title }}</button>
      <app-status-chip-curriculum [state]="module().contentStatus" />
      @if (!disabled()) {
        <div class="order-buttons">
          <button mat-icon-button type="button" [attr.aria-label]="'Move ' + module().title + ' up'"
                  [disabled]="position() === 0" (click)="moveUp.emit()">
            <mat-icon aria-hidden="true">keyboard_arrow_up</mat-icon>
          </button>
          <button mat-icon-button type="button" [attr.aria-label]="'Move ' + module().title + ' down'"
                  [disabled]="position() === total() - 1" (click)="moveDown.emit()">
            <mat-icon aria-hidden="true">keyboard_arrow_down</mat-icon>
          </button>
        </div>
      }
    </div>
  `
})
export class ModuleListRowComponent {
  module = input.required<CurriculumModule>();
  position = input.required<number>();
  total = input.required<number>();
  disabled = input(false);

  open = output<void>();
  moveUp = output<void>();
  moveDown = output<void>();
}
