import { Component, OnChanges, SimpleChanges, computed, inject, input, output, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Lesson, LessonContentBlock, LessonContentType, ReorderLessonContentBlockEntry } from '../../../core/models/curriculum.model';
import { LessonContentBlockApiService } from '../../../core/services/lesson-content-block-api.service';
import { CurriculumUiError, toCurriculumUiError } from '../../../core/services/curriculum-api-error.util';
import { CurriculumMessageComponent } from '../../../shared/curriculum/curriculum-message';
import { LessonBlockRowComponent } from './lesson-block-row';
import { LessonBlockEditorComponent, LessonBlockEditorSaveEvent } from './lesson-block-editor';
import { DeleteBlockConfirmDialog, DeleteBlockConfirmResult } from './delete-block-confirm-dialog';

const CONTENT_TYPE_LABEL: Record<LessonContentBlock['contentType'], string> = {
  VIDEO: 'video', TEXT: 'text', PDF_LINK: 'PDF link', EXTERNAL_LINK: 'external link'
};

/** The four approved explicit add actions, in the order they're shown -- never a generic "Add Block" + type-picker (architect correction: this is a lesson-content composer, not a page-builder). */
const ADD_ACTIONS: { type: LessonContentType; label: string; icon: string }[] = [
  { type: 'TEXT', label: 'Add Text', icon: 'article' },
  { type: 'VIDEO', label: 'Add Video', icon: 'play_circle' },
  { type: 'PDF_LINK', label: 'Add PDF', icon: 'picture_as_pdf' },
  { type: 'EXTERNAL_LINK', label: 'Add External Link', icon: 'link' }
];

/**
 * MC-3: the block-native replacement for LessonEditorComponent's old
 * per-type content form, scoped to one lesson's lesson_content_blocks.
 * Fully block-native by design -- the empty-list and populated-list cases
 * render through the exact same "list of rows + Add" structure, no
 * 0-vs->=1-block branching anywhere (architect decision 5).
 *
 * Row-version contract (binding, see LessonContentBlockMutationResponse's
 * own doc comment): every mutation response's `lesson` field is the one
 * and only source of truth for the next `expectedLessonRowVersion` --
 * `lessonUpdated` re-emits it immediately after every successful
 * create/update/delete/reorder/repair so the parent LessonEditorComponent
 * (which owns the routed Lesson and its Publish/Unpublish/Archive actions)
 * never mutates against a value this component has since moved past. A
 * reorder of N blocks can advance it by up to 2N -- never assumed here or
 * by the parent.
 *
 * <p>MC-3 architect correction -- {@link #readyForPublish}: client-side
 * publish-readiness computed purely from the block state already loaded
 * here (zero blocks, or any locally incomplete block, disables Publish;
 * all locally complete enables it) -- backend `assertPublishReady` stays
 * fully authoritative regardless (a request can still be rejected server-
 * side, e.g. a VIDEO block whose live reachability re-check fails, which
 * this client-side check deliberately does not duplicate). This is a
 * public, readonly `computed()` signal, not an output event -- the parent
 * (LessonEditorComponent) reads it directly via a signal `viewChild()`
 * query rather than this component pushing duplicate state up into a
 * second, parent-owned copy that could drift out of sync.
 */
@Component({
  selector: 'app-lesson-block-list',
  standalone: true,
  imports: [DragDropModule, MatButtonModule, MatIconModule, MatDialogModule, CurriculumMessageComponent, LessonBlockRowComponent, LessonBlockEditorComponent],
  styles: [`
    button[mat-flat-button], button[mat-stroked-button], button[mat-button] { min-height: 44px; }
    :host { display: block; }
    .block-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
    .section-header { display: flex; flex-direction: column; gap: 8px; margin: 20px 0 8px; }
    .add-actions { display: flex; gap: 8px; flex-wrap: wrap; }
  `],
  template: `
    <div class="section-header">
      <h3 style="margin:0">Content Blocks</h3>
      @if (!disabled() && addingType() === null) {
        <div class="add-actions">
          @for (a of addActions; track a.type) {
            <button mat-stroked-button type="button" (click)="startAdd(a.type)">
              <mat-icon>{{ a.icon }}</mat-icon> {{ a.label }}
            </button>
          }
        </div>
      }
    </div>

    <app-curriculum-message [error]="actionError()" (reload)="load()" />

    @if (loading()) {
      <p style="color:#adb5bd">Loading blocks…</p>
    } @else {
      <div class="block-list" cdkDropList (cdkDropListDropped)="onDrop($event)">
        @for (b of blocks(); track b.id; let i = $index) {
          <div cdkDrag [cdkDragDisabled]="disabled()" [cdkDragData]="b">
            <app-lesson-block-row
              [block]="b" [position]="i" [total]="blocks().length" [disabled]="disabled()"
              [editing]="editingBlockId() === b.id"
              (editToggle)="toggleEdit(b.id)"
              (save)="saveEdit(b, $event)"
              (delete)="confirmDelete(b)"
              (moveUp)="moveUp(i)" (moveDown)="moveDown(i)"
              (repair)="repairVideo(b, $event)" />
          </div>
        }
      </div>

      @if (addingType(); as type) {
        <app-lesson-block-editor mode="create" [presetContentType]="type" [disabled]="disabled()" (save)="saveNew($event)" (cancel)="addingType.set(null)" />
      } @else if (blocks().length === 0 && !disabled()) {
        <p style="color:#6c757d;font-size:0.85rem">No content blocks yet — add the first one.</p>
      }
    }
  `
})
export class LessonBlockListComponent implements OnChanges {
  private blockApi = inject(LessonContentBlockApiService);
  private dialog = inject(MatDialog);
  private announcer = inject(LiveAnnouncer);

  moduleId = input.required<number>();
  lessonId = input.required<number>();
  lessonRowVersion = input.required<number>();
  disabled = input(false);

  /** Fires with the freshly-refreshed parent Lesson after every successful block mutation -- see this component's own doc comment for the opaque-rowVersion contract this exists to uphold. */
  lessonUpdated = output<Lesson>();

  addActions = ADD_ACTIONS;

  blocks = signal<LessonContentBlock[]>([]);
  loading = signal(true);
  actionError = signal<CurriculumUiError | null>(null);
  addingType = signal<LessonContentType | null>(null);
  editingBlockId = signal<number | null>(null);

  /** See this class's own doc comment -- the parent reads this, never re-derives it from a duplicated block list. */
  readyForPublish = computed(() => {
    if (this.loading()) return false;
    const bs = this.blocks();
    return bs.length > 0 && bs.every(b => this.isLocallyComplete(b));
  });

  private isLocallyComplete(b: LessonContentBlock): boolean {
    switch (b.contentType) {
      case 'VIDEO': return b.videoId !== null; // live reachability is re-checked authoritatively by the backend at Publish, never duplicated here
      case 'TEXT': return !!b.textContent?.trim();
      case 'PDF_LINK':
      case 'EXTERNAL_LINK': return !!b.externalUrl?.trim() && !!b.externalLinkLabel?.trim();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['lessonId']) this.load();
  }

  load() {
    this.loading.set(true);
    this.actionError.set(null);
    this.blockApi.list(this.lessonId()).subscribe({
      next: blocks => { this.blocks.set([...blocks].sort((a, b) => a.displayOrder - b.displayOrder)); this.loading.set(false); },
      error: (err: HttpErrorResponse) => { this.actionError.set(toCurriculumUiError(err)); this.loading.set(false); }
    });
  }

  startAdd(type: LessonContentType) {
    this.editingBlockId.set(null);
    this.addingType.set(type);
  }

  toggleEdit(blockId: number) {
    this.addingType.set(null);
    this.editingBlockId.set(this.editingBlockId() === blockId ? null : blockId);
  }

  saveNew(e: LessonBlockEditorSaveEvent) {
    this.actionError.set(null);
    this.blockApi.create(this.lessonId(), { ...e, expectedLessonRowVersion: this.lessonRowVersion() }).subscribe({
      next: res => {
        this.blocks.update(bs => [...bs, res.block].sort((a, b) => a.displayOrder - b.displayOrder));
        this.addingType.set(null);
        this.lessonUpdated.emit(res.lesson);
      },
      error: (err: HttpErrorResponse) => this.reportConflict(err, 'This lesson changed elsewhere — reload before adding a block')
    });
  }

  saveEdit(existing: LessonContentBlock, e: LessonBlockEditorSaveEvent) {
    this.actionError.set(null);
    this.blockApi.update(this.lessonId(), existing.id, {
      youtubeUrl: e.youtubeUrl, textContent: e.textContent, externalUrl: e.externalUrl, externalLinkLabel: e.externalLinkLabel,
      heading: e.heading, expectedLessonRowVersion: this.lessonRowVersion()
    }).subscribe({
      next: res => {
        this.blocks.update(bs => bs.map(b => b.id === res.block.id ? res.block : b));
        this.editingBlockId.set(null);
        this.lessonUpdated.emit(res.lesson);
      },
      error: (err: HttpErrorResponse) => this.reportConflict(err, 'This lesson changed elsewhere — reload before saving this block')
    });
  }

  confirmDelete(block: LessonContentBlock) {
    const data = { moduleId: this.moduleId(), lessonId: this.lessonId(), blockId: block.id, contentTypeLabel: CONTENT_TYPE_LABEL[block.contentType] };
    this.dialog.open(DeleteBlockConfirmDialog, { width: '440px', data })
      .afterClosed().subscribe((result: DeleteBlockConfirmResult | null) => {
        if (!result) return;
        this.actionError.set(null);
        // Guarded delete: the dialog's own fresh re-read rowVersion, not the (possibly stale) one this component was passed.
        this.blockApi.delete(this.lessonId(), block.id, { expectedLessonRowVersion: result.expectedLessonRowVersion }).subscribe({
          next: lesson => {
            this.blocks.update(bs => bs.filter(b => b.id !== block.id));
            this.lessonUpdated.emit(lesson);
          },
          error: (err: HttpErrorResponse) => this.reportConflict(err, 'This lesson changed elsewhere — reload before removing this block')
        });
      });
  }

  repairVideo(block: LessonContentBlock, url: string) {
    this.actionError.set(null);
    this.blockApi.repairVideo(this.lessonId(), block.id, { url, expectedLessonRowVersion: this.lessonRowVersion() }).subscribe({
      next: res => {
        this.blocks.update(bs => bs.map(b => b.id === res.block.id ? res.block : b));
        this.lessonUpdated.emit(res.lesson);
      },
      error: (err: HttpErrorResponse) => this.reportConflict(err, 'This lesson changed elsewhere — reload before repairing this block')
    });
  }

  onDrop(event: CdkDragDrop<LessonContentBlock[]>) {
    if (this.disabled() || event.previousIndex === event.currentIndex) return;
    const reordered = [...this.blocks()];
    moveItemInArray(reordered, event.previousIndex, event.currentIndex);
    this.applyReorder(reordered);
  }

  moveUp(i: number) {
    if (this.disabled() || i <= 0) return;
    const reordered = [...this.blocks()];
    [reordered[i - 1], reordered[i]] = [reordered[i], reordered[i - 1]];
    this.applyReorder(reordered);
  }

  moveDown(i: number) {
    const all = this.blocks();
    if (this.disabled() || i < 0 || i >= all.length - 1) return;
    const reordered = [...all];
    [reordered[i], reordered[i + 1]] = [reordered[i + 1], reordered[i]];
    this.applyReorder(reordered);
  }

  private applyReorder(newOrder: LessonContentBlock[]) {
    const entries: ReorderLessonContentBlockEntry[] = newOrder
      .map((b, idx) => ({ blockId: b.id, newOrder: idx + 1 }))
      .filter(entry => {
        const current = this.blocks().find(b => b.id === entry.blockId);
        return current !== undefined && current.displayOrder !== entry.newOrder;
      });
    if (entries.length === 0) return;
    this.actionError.set(null);
    this.blockApi.reorder(this.lessonId(), { expectedLessonRowVersion: this.lessonRowVersion(), entries }).subscribe({
      next: res => {
        this.blocks.set([...res.blocks].sort((a, b) => a.displayOrder - b.displayOrder));
        this.lessonUpdated.emit(res.lesson);
        this.announcer.announce('Block order updated');
      },
      error: (err: HttpErrorResponse) => this.reportConflict(err, 'Block order changed elsewhere — reload before reordering')
    });
  }

  private reportConflict(err: HttpErrorResponse, conflictMessage: string) {
    const e = toCurriculumUiError(err);
    if (e.kind === 'conflict') e.message = conflictMessage;
    this.actionError.set(e);
  }
}
