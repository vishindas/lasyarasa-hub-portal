import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { YouTubeValidationResultKind } from '../../../core/models/curriculum.model';
import { YouTubeUrlValidationApiService } from '../../../core/services/youtube-url-validation-api.service';
import { CurriculumUiError, toCurriculumUiError } from '../../../core/services/curriculum-api-error.util';
import { CurriculumMessageComponent } from '../../../shared/curriculum/curriculum-message';

export interface YouTubeValidatedEvent {
  result: YouTubeValidationResultKind;
  videoId: string | null;
  url: string;
}

/**
 * Reusable YouTube URL entry + "Validate & Preview" + the four named
 * failure banners (Slice 7 §6.2 / §8, Slice 8 architect decision 2's
 * corrected 4-outcome set -- PRIVATE folded into UNAVAILABLE). Used inside
 * both the Lesson Editor (Video content type) and the repair-video flow
 * (Phase 4), so this copy table and validation-request logic exist exactly
 * once. Copy is frontend-owned: ValidateYouTubeUrlResponse carries no
 * message field, and these three strings are kept byte-identical to
 * LessonService.validationFailureMessage() on the backend.
 */
@Component({
  selector: 'app-youtube-url-validator',
  standalone: true,
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, CurriculumMessageComponent],
  styles: [`
    button[mat-flat-button], button[mat-stroked-button], button[mat-button] { min-height: 44px; }
    .validate-row { display: flex; align-items: flex-start; gap: 10px; flex-wrap: wrap; }
    .validate-row mat-form-field { flex: 1; min-width: 240px; }
    .banner {
      display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: 8px;
      margin-top: 8px; font-size: 0.85rem;
    }
    .banner.invalid, .banner.unsupported, .banner.unavailable { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
    .banner.valid { background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }
    mat-icon { font-size: 18px; width: 18px; height: 18px; flex-shrink: 0; }
  `],
  template: `
    <div class="validate-row">
      <mat-form-field appearance="outline">
        <mat-label>YouTube URL</mat-label>
        <input matInput [(ngModel)]="url" placeholder="Paste a YouTube watch, share or youtu.be link" [disabled]="disabled()" />
      </mat-form-field>
      <button mat-stroked-button type="button" [disabled]="disabled() || !url.trim() || validating()" (click)="validate()">
        {{ validating() ? 'Validating…' : 'Validate & Preview' }}
      </button>
    </div>

    <app-curriculum-message [error]="requestError()" (retry)="validate()" />

    @if (result(); as r) {
      @if (r.result === 'VALID') {
        <div class="banner valid">
          <mat-icon aria-hidden="true">check_circle</mat-icon>
          Video validated successfully.
        </div>
      } @else {
        <div class="banner {{ r.result.toLowerCase() }}">
          <mat-icon aria-hidden="true">error_outline</mat-icon>
          {{ bannerCopy(r.result) }}
        </div>
      }
    }
  `
})
export class YouTubeUrlValidatorComponent implements OnInit {
  private api = inject(YouTubeUrlValidationApiService);
  private announcer = inject(LiveAnnouncer);

  disabled = input(false);
  initialUrl = input<string>('');
  initialVideoId = input<string | null>(null);

  validated = output<YouTubeValidatedEvent>();

  url = '';
  validating = signal(false);
  result = signal<{ result: YouTubeValidationResultKind; videoId: string | null } | null>(null);
  requestError = signal<CurriculumUiError | null>(null);

  ngOnInit() {
    this.url = this.initialUrl();
    if (this.initialVideoId()) {
      this.result.set({ result: 'VALID', videoId: this.initialVideoId() });
    }
  }

  validate() {
    const trimmed = this.url.trim();
    if (!trimmed) return;
    this.validating.set(true);
    this.result.set(null);
    this.requestError.set(null);
    this.api.validate(trimmed).subscribe({
      next: res => {
        this.validating.set(false);
        this.result.set({ result: res.result, videoId: res.videoId });
        this.announcer.announce(res.result === 'VALID' ? 'Video validated successfully' : this.bannerCopy(res.result));
        this.validated.emit({ result: res.result, videoId: res.videoId, url: trimmed });
      },
      // The request itself failing to run (network/500/WRITE_FROZEN/FULL_OUTAGE) is
      // distinct from a successful response naming a non-VALID result (Slice 7 Part V:
      // "Generic retry if the check itself fails to run").
      error: (err: HttpErrorResponse) => {
        this.validating.set(false);
        this.requestError.set(toCurriculumUiError(err));
      }
    });
  }

  bannerCopy(r: YouTubeValidationResultKind): string {
    switch (r) {
      case 'INVALID': return 'Enter a supported YouTube URL (for example youtube.com/watch?v=… or youtu.be/…).';
      case 'UNSUPPORTED': return "This YouTube link type isn't supported. Use a standard youtube.com/watch or youtu.be video link.";
      case 'UNAVAILABLE': return 'This video is private, removed, restricted, or currently unavailable.';
      default: return '';
    }
  }
}
