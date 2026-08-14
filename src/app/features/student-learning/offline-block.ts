import { Component, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

/**
 * Part III "Offline / network failure" -- correction 9's exact corrected
 * copy: no false "stays visible" claim (this MVP does not implement
 * offline caching), only that new content can't load right now.
 */
@Component({
  selector: 'app-offline-block',
  standalone: true,
  imports: [MatIconModule, MatButtonModule],
  styles: [`
    .block {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 14px; padding: 64px 24px; text-align: center; color: #6B6255; min-height: 320px;
    }
    mat-icon { font-size: 40px; width: 40px; height: 40px; color: #adb5bd; }
    .block p { max-width: 420px; font-size: 0.95rem; margin: 0; }
    button { min-height: 44px; }
    @media (prefers-reduced-motion: reduce) { .block { transition: none; } }
  `],
  template: `
    <div class="block" role="status" aria-live="polite">
      <mat-icon aria-hidden="true">wifi_off</mat-icon>
      <p>You're offline. New content can't load right now.</p>
      <button mat-stroked-button (click)="retry.emit()">Retry</button>
    </div>
  `
})
export class OfflineBlockComponent {
  retry = output<void>();
}
