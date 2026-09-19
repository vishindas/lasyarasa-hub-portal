import { Component, OnInit, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { LessonContentBlock, LessonContentType } from '../../../core/models/curriculum.model';
import { YouTubeUrlValidatorComponent, YouTubeValidatedEvent } from './youtube-url-validator';

export interface LessonBlockEditorSaveEvent {
  contentType: LessonContentType;
  youtubeUrl: string | null;
  textContent: string | null;
  externalUrl: string | null;
  externalLinkLabel: string | null;
}

/**
 * MC-3: inline create/edit form for exactly ONE content block -- the
 * block-native replacement for LessonEditorComponent's old per-type
 * switch, scoped one level down. An incomplete block is legal here (MC-1
 * chk_block_content_shape correction) -- Save never requires a value to be
 * present, only that a value that IS supplied be well-formed; publish-time
 * completeness is enforced server-side by
 * LessonContentBlockService.assertPublishReady.
 *
 * <p>MC-3 architect correction: this is a lesson-content composer, not a
 * generic page-builder picker -- there is no in-editor content-type
 * toggle. contentType is fixed the moment this component opens, from
 * exactly one of two sources: {@code existingBlock()}'s own (already
 * immutable, per {@code CreateLessonContentBlockRequest}'s own contract)
 * type in edit mode, or the caller-supplied {@code presetContentType()} in
 * create mode -- the caller is LessonBlockListComponent's four explicit
 * "Add Text"/"Add Video"/"Add PDF"/"Add External Link" actions, each of
 * which already knows which type it means before this component ever
 * opens. Once resolved in {@link #ngOnInit}, contentType never changes for
 * the remainder of this component's lifetime.
 *
 * Ownership split, same as YouTubeUrlValidatorComponent's own doc comment:
 * this component only builds and emits the content payload -- it never
 * calls the API itself. The caller (LessonBlockListComponent) owns the
 * parent lesson's rowVersion and therefore the actual create/update call.
 */
@Component({
  selector: 'app-lesson-block-editor',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, YouTubeUrlValidatorComponent],
  styles: [`
    button[mat-flat-button], button[mat-stroked-button], button[mat-button] { min-height: 44px; }
    :host { display: block; }
    .panel { display: flex; flex-direction: column; gap: 12px; padding: 12px; border: 1px dashed #d1d5db; border-radius: 8px; background: #fbfbfe; }
    mat-form-field { width: 100%; }
    .actions { display: flex; gap: 8px; flex-wrap: wrap; }
  `],
  template: `
    <div class="panel">
      @switch (contentType()) {
        @case ('VIDEO') {
          <app-youtube-url-validator
            [disabled]="disabled()"
            [initialUrl]="initialVideoUrl"
            [initialVideoId]="initialVideoId"
            (validated)="onVideoValidated($event)"
            (cleared)="onVideoCleared()" />
        }
        @case ('TEXT') {
          <mat-form-field appearance="outline">
            <mat-label>Lesson text</mat-label>
            <textarea matInput rows="6" [(ngModel)]="textContent" placeholder="Write the block content students will read" [disabled]="disabled()"></textarea>
          </mat-form-field>
        }
        @case ('PDF_LINK') {
          <mat-form-field appearance="outline">
            <mat-label>PDF URL</mat-label>
            <input matInput [(ngModel)]="externalUrl" placeholder="Link to a PDF your students can open" [disabled]="disabled()" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Label</mat-label>
            <input matInput [(ngModel)]="externalLinkLabel" placeholder="Label shown to students" [disabled]="disabled()" />
          </mat-form-field>
        }
        @case ('EXTERNAL_LINK') {
          <mat-form-field appearance="outline">
            <mat-label>External URL</mat-label>
            <input matInput [(ngModel)]="externalUrl" placeholder="Link to a supporting resource" [disabled]="disabled()" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Label</mat-label>
            <input matInput [(ngModel)]="externalLinkLabel" placeholder="Label shown to students" [disabled]="disabled()" />
          </mat-form-field>
        }
      }

      <div class="actions">
        <button mat-flat-button color="primary" type="button" [disabled]="disabled()" (click)="onSave()">Save Block</button>
        <button mat-stroked-button type="button" [disabled]="disabled()" (click)="cancel.emit()">Cancel</button>
      </div>
    </div>
  `
})
export class LessonBlockEditorComponent implements OnInit {
  mode = input.required<'create' | 'edit'>();
  existingBlock = input<LessonContentBlock | null>(null);
  /** Create mode only -- the explicit "Add Text"/"Add Video"/"Add PDF"/"Add External Link" action the caller invoked. Ignored (existingBlock's own type wins) in edit mode. */
  presetContentType = input<LessonContentType | null>(null);
  disabled = input(false);

  save = output<LessonBlockEditorSaveEvent>();
  cancel = output<void>();

  contentType = signal<LessonContentType>('TEXT');

  textContent = '';
  externalUrl = '';
  externalLinkLabel = '';
  initialVideoUrl = '';
  initialVideoId: string | null = null;

  private validatedVideoId = signal<string | null>(null);
  private lastValidatedUrl: string | null = null;

  ngOnInit() {
    const existing = this.existingBlock();
    if (this.mode() === 'edit' && existing) {
      this.contentType.set(existing.contentType);
      this.textContent = existing.textContent ?? '';
      this.externalUrl = existing.externalUrl ?? '';
      this.externalLinkLabel = existing.externalLinkLabel ?? '';
      if (existing.contentType === 'VIDEO' && existing.videoId) {
        const url = `https://www.youtube.com/watch?v=${existing.videoId}`;
        this.initialVideoUrl = url;
        this.initialVideoId = existing.videoId;
        this.validatedVideoId.set(existing.videoId);
        this.lastValidatedUrl = url;
      }
    } else {
      const preset = this.presetContentType();
      if (preset) this.contentType.set(preset);
    }
  }

  onVideoValidated(e: YouTubeValidatedEvent) {
    this.validatedVideoId.set(e.result === 'VALID' ? e.videoId : null);
    this.lastValidatedUrl = e.result === 'VALID' ? e.url : null;
  }

  onVideoCleared() {
    this.validatedVideoId.set(null);
    this.lastValidatedUrl = null;
  }

  onSave() {
    const type = this.contentType();
    let youtubeUrl: string | null = null;
    if (type === 'VIDEO') {
      // CURR-FUNC-04 reused unchanged one level down: an unedited, already-stored
      // video sends null ("keep the currently stored video", no revalidation);
      // any freshly validated url (new or replacing) is sent as-is.
      if (this.validatedVideoId() && this.lastValidatedUrl !== this.initialVideoUrl) {
        youtubeUrl = this.lastValidatedUrl;
      }
    }
    this.save.emit({
      contentType: type,
      youtubeUrl,
      textContent: type === 'TEXT' ? (this.textContent.trim() || null) : null,
      externalUrl: (type === 'PDF_LINK' || type === 'EXTERNAL_LINK') ? (this.externalUrl.trim() || null) : null,
      externalLinkLabel: (type === 'PDF_LINK' || type === 'EXTERNAL_LINK') ? (this.externalLinkLabel.trim() || null) : null
    });
  }
}
