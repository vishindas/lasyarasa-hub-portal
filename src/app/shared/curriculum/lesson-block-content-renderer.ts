import { Component, computed, inject, input } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MatIconModule } from '@angular/material/icon';
import { LessonContentType, LessonVideoAvailability } from '../../core/models/curriculum.model';

/**
 * MC-4: the minimal shape this renderer actually needs -- deliberately not
 * the admin `LessonContentBlock` type itself, so this stays usable for
 * both the admin block editor/preview (MC-3) and the student lesson
 * detail (MC-4)'s own, separately-shaped block DTO. Both existing block
 * shapes structurally satisfy this interface already (TypeScript duck
 * typing -- no `implements` needed), each carrying extra fields (`id`,
 * `displayOrder`, `lessonId`, ...) this renderer simply never reads.
 *
 * <p>Fields are `?: X | null` (optional AND nullable), not just one or
 * the other -- the admin shape (`LessonContentBlock`) always has these
 * present but nullable (`videoId: string | null`), while the student
 * shape (`StudentContentBlock`) omits them entirely when not applicable
 * (`videoId?: string`, per its `@JsonInclude(NON_NULL)` backend DTO).
 * `?: X | null` is the one shape both a required-nullable and a
 * truly-optional source property are structurally assignable to.
 */
export interface RenderableContentBlock {
  contentType: LessonContentType;
  videoId?: string | null;
  videoAvailability?: LessonVideoAvailability | null;
  textContent?: string | null;
  externalUrl?: string | null;
  externalLinkLabel?: string | null;
}

/**
 * MC-3, moved (not copied) to shared/curriculum for MC-4: presentational-
 * only renderer for one content block's actual content -- a real
 * youtube-nocookie.com privacy-enhanced embed (never arbitrary embed
 * HTML, never autoplay), lesson text, or a resource link. Shared,
 * primitive-typed so the embed-construction logic exists exactly once --
 * used by the admin block editor/row/preview (MC-3) and student lesson
 * detail (MC-4), each supplying their own presentational chrome (captions,
 * spacing) around this primitive rather than a second rendering
 * implementation. Never fetches, never mutates, never triggers a live
 * reachability check -- a video block's own availability check (check-
 * video/repair-video, admin only) is entirely the caller's responsibility.
 *
 * <p>MC-4 architect correction -- VIDEO decision order: {@code
 * videoAvailability === 'UNAVAILABLE'} is checked BEFORE a missing {@code
 * videoId}, not after. The student-facing block DTO always omits {@code
 * videoId} when UNAVAILABLE (never a stale/irrelevant value), so checking
 * "is videoId missing" first would incorrectly render the "No video
 * selected yet" placeholder for an unavailable video instead of the
 * established unavailable-video placeholder. This ordering is load-
 * bearing for both callers -- an admin block can equally have a stored
 * `videoId` alongside `videoAvailability = UNAVAILABLE` (repair not yet
 * run), and must render the same way.
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
        @if (block().videoAvailability === 'UNAVAILABLE') {
          <div class="unavailable-block">
            <mat-icon aria-hidden="true" style="font-size:32px;width:32px;height:32px">videocam_off</mat-icon>
            <p>This video is currently unavailable.</p>
          </div>
        } @else if (!block().videoId) {
          <div class="pending-block">
            <mat-icon aria-hidden="true">videocam_off</mat-icon> No video selected yet.
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

  block = input.required<RenderableContentBlock>();

  embedUrl = computed<SafeResourceUrl | null>(() => {
    const b = this.block();
    if (b.contentType !== 'VIDEO' || !b.videoId || b.videoAvailability !== 'AVAILABLE') return null;
    const url = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(b.videoId)}?autoplay=0`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  });
}
