import { Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { LessonContentBlock } from '../../../core/models/curriculum.model';
import { LessonBlockContentRendererComponent } from './lesson-block-content-renderer';
import { LessonBlockEditorComponent, LessonBlockEditorSaveEvent } from './lesson-block-editor';
import { YouTubeUrlValidatorComponent, YouTubeValidatedEvent } from './youtube-url-validator';

const CONTENT_TYPE_LABEL: Record<LessonContentBlock['contentType'], string> = {
  VIDEO: 'Video', TEXT: 'Text', PDF_LINK: 'PDF Link', EXTERNAL_LINK: 'External Link'
};
const CONTENT_TYPE_ICON: Record<LessonContentBlock['contentType'], string> = {
  VIDEO: 'play_circle', TEXT: 'article', PDF_LINK: 'picture_as_pdf', EXTERNAL_LINK: 'link'
};

/**
 * MC-3: one content block's row inside the block-native lesson editor --
 * mirrors LessonListRowComponent's own reorder-button/44px/aria-label
 * pattern one level down. No ARCHIVED-block concept exists (blocks carry
 * no lifecycle of their own), so unlike lessons every row is always
 * reorderable/removable while the parent lesson itself is editable --
 * disabled() is the sole, parent-owned gate for all of it.
 *
 * VIDEO repair/republish is block-level here (LessonContentBlockService's
 * own check-video/repair-video endpoints, MC-2), independent of the
 * lesson-level repair-video flow LessonEditorComponent still runs for a
 * genuinely legacy (pre-MC-3) VIDEO lesson -- no block-level attestation
 * exists (attestation stays lesson-level, out of scope for blocks).
 */
@Component({
  selector: 'app-lesson-block-row',
  standalone: true,
  imports: [MatIconModule, MatButtonModule, LessonBlockContentRendererComponent, LessonBlockEditorComponent, YouTubeUrlValidatorComponent],
  styles: [`
    button[mat-flat-button], button[mat-stroked-button], button[mat-button] { min-height: 44px; }
    .row {
      display: flex; flex-direction: column; gap: 10px;
      padding: 10px 8px; border-radius: 8px; border: 1px solid #edf0f7; background: #fff;
    }
    .row-header { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .drag-handle { color: #adb5bd; cursor: grab; touch-action: none; }
    .type-icon { font-size: 18px; width: 18px; height: 18px; color: #6c757d; flex-shrink: 0; }
    .type-label { flex: 1; font-size: 0.85rem; font-weight: 600; color: #1a1f36; }
    .unavailable-badge {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 3px 10px 3px 8px; border-radius: 20px; font-size: 0.72rem; font-weight: 600;
      background: #fef3c7; color: #92400e;
    }
    .unavailable-badge mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .order-buttons { display: flex; }
    .order-buttons button.mat-mdc-icon-button { width: 44px; height: 44px; padding: 10px; }
    .repair-banner {
      display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: 8px;
      background: #fef3c7; color: #92400e; border: 1px solid #fde68a; font-size: 0.85rem;
    }
  `],
  template: `
    <div class="row">
      <div class="row-header">
        @if (!disabled()) {
          <mat-icon class="drag-handle" aria-hidden="true">drag_indicator</mat-icon>
        }
        <mat-icon class="type-icon" aria-hidden="true">{{ typeIcon() }}</mat-icon>
        <span class="type-label">{{ typeLabel() }}</span>
        @if (block().contentType === 'VIDEO' && block().videoAvailability === 'UNAVAILABLE') {
          <span class="unavailable-badge">
            <mat-icon aria-hidden="true">warning</mat-icon>
            Video unavailable
          </span>
        }
        @if (!editing()) {
          <button mat-button type="button" [disabled]="disabled()" (click)="editToggle.emit()">Edit</button>
          <button mat-button color="warn" type="button" [disabled]="disabled()" (click)="delete.emit()">Remove</button>
        }
        @if (!disabled()) {
          <div class="order-buttons">
            <button mat-icon-button type="button" [attr.aria-label]="'Move ' + typeLabel() + ' block up'"
                    [disabled]="position() === 0" (click)="moveUp.emit()">
              <mat-icon aria-hidden="true">keyboard_arrow_up</mat-icon>
            </button>
            <button mat-icon-button type="button" [attr.aria-label]="'Move ' + typeLabel() + ' block down'"
                    [disabled]="position() === total() - 1" (click)="moveDown.emit()">
              <mat-icon aria-hidden="true">keyboard_arrow_down</mat-icon>
            </button>
          </div>
        }
      </div>

      @if (editing()) {
        <app-lesson-block-editor mode="edit" [existingBlock]="block()" [disabled]="disabled()"
          (save)="save.emit($event)" (cancel)="editToggle.emit()" />
      } @else {
        @if (block().contentType === 'VIDEO' && block().videoAvailability === 'UNAVAILABLE') {
          <div class="repair-banner">
            <mat-icon aria-hidden="true">warning</mat-icon>
            This video is private, removed, restricted, or currently unavailable. Repair or replace the link.
          </div>
          <app-youtube-url-validator [disabled]="disabled()" (validated)="onRepairValidated($event)" (cleared)="onRepairCleared()" />
          <button mat-flat-button color="primary" type="button" [disabled]="disabled() || !repairUrl" (click)="repair.emit(repairUrl!)">
            Republish Video
          </button>
        } @else {
          <app-lesson-block-content-renderer [block]="block()" />
        }
      }
    </div>
  `
})
export class LessonBlockRowComponent {
  block = input.required<LessonContentBlock>();
  position = input.required<number>();
  total = input.required<number>();
  disabled = input(false);
  editing = input(false);

  editToggle = output<void>();
  save = output<LessonBlockEditorSaveEvent>();
  delete = output<void>();
  moveUp = output<void>();
  moveDown = output<void>();
  repair = output<string>();

  repairUrl: string | null = null;

  typeLabel(): string { return CONTENT_TYPE_LABEL[this.block().contentType]; }
  typeIcon(): string { return CONTENT_TYPE_ICON[this.block().contentType]; }

  onRepairValidated(e: YouTubeValidatedEvent) {
    this.repairUrl = e.result === 'VALID' ? e.url : null;
  }

  onRepairCleared() {
    this.repairUrl = null;
  }
}
