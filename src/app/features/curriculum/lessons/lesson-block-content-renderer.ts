import { Component, computed, inject, input } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MatIconModule } from '@angular/material/icon';
import { LessonContentBlock } from '../../../core/models/curriculum.model';

/**
 * MC-3: presentational-only renderer for one content block's actual
 * content -- a real youtube-nocookie.com privacy-enhanced embed (never
 * arbitrary embed HTML, never autoplay, same construction Lesson Preview's
 * legacy VIDEO branch already used), lesson text, or a resource link.
 * Shared, primitive-typed (`LessonContentBlock` in, nothing else) so the
 * embed-construction logic exists exactly once -- used by both
 * LessonBlockRowComponent (admin, compact "what does this block contain"
 * summary) and LessonPreviewComponent (the full block-native preview,
 * MC-4's future student renderer is expected to reuse this same shape).
 * Never fetches, never mutates -- a video block's own availability check
 * (check-video/repair-video) is entirely the caller's responsibility.
 */
@Component({
  selector: 'app-lesson-block-content-renderer',
  standalone: true,
  imports: [MatIconModule],
  styles: [`
    :host { display: block; }
    .embed-frame { position: relative; width: 100%; aspect-ratio: 16/9; background: #000; border-radius: 8px; overflow: hidden; }
    .embed-frame iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
    .unavailable-block {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 10px; width: 100%; aspect-ratio: 16/9; background: #f1f5f9; color: #475569;
      border-radius: 8px; text-align: center; padding: 24px;
    }
    .pending-block {
      display: flex; align-items: center; justify-content: center; gap: 8px;
      padding: 16px; background: #f8f9fc; color: #6c757d; border-radius: 8px; font-size: 0.85rem;
    }
    .lesson-text { white-space: pre-wrap; line-height: 1.6; }
    .resource-card { display: flex; align-items: center; gap: 10px; padding: 16px; border: 1px solid #e2e8f0; border-radius: 8px; }
  `],
  template: `
    @switch (block().contentType) {
      @case ('VIDEO') {
        @if (!block().videoId) {
          <div class="pending-block">
            <mat-icon aria-hidden="true">videocam_off</mat-icon> No video selected yet.
          </div>
        } @else if (block().videoAvailability === 'UNAVAILABLE') {
          <div class="unavailable-block">
            <mat-icon aria-hidden="true" style="font-size:32px;width:32px;height:32px">videocam_off</mat-icon>
            <p>This video is currently unavailable.</p>
          </div>
        } @else if (embedUrl(); as url) {
          <div class="embed-frame">
            <iframe [src]="url" title="Lesson video" allow="encrypted-media" allowfullscreen></iframe>
          </div>
        }
      }
      @case ('TEXT') {
        @if (block().textContent) {
          <p class="lesson-text">{{ block().textContent }}</p>
        } @else {
          <div class="pending-block"><mat-icon aria-hidden="true">article</mat-icon> No text added yet.</div>
        }
      }
      @default {
        @if (block().externalUrl && block().externalLinkLabel) {
          <div class="resource-card">
            <mat-icon aria-hidden="true">{{ block().contentType === 'PDF_LINK' ? 'picture_as_pdf' : 'link' }}</mat-icon>
            <a [href]="block().externalUrl" target="_blank" rel="noopener noreferrer">{{ block().externalLinkLabel }}</a>
          </div>
        } @else {
          <div class="pending-block"><mat-icon aria-hidden="true">link_off</mat-icon> No link added yet.</div>
        }
      }
    }
  `
})
export class LessonBlockContentRendererComponent {
  private sanitizer = inject(DomSanitizer);

  block = input.required<LessonContentBlock>();

  embedUrl = computed<SafeResourceUrl | null>(() => {
    const b = this.block();
    if (b.contentType !== 'VIDEO' || !b.videoId || b.videoAvailability !== 'AVAILABLE') return null;
    const url = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(b.videoId)}?autoplay=0`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  });
}
