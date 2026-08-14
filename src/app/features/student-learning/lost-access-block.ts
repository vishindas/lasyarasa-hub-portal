import { Component, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

/**
 * Part III "Lost student access" -- correction 9's exact corrected copy:
 * "You can no longer access this student." plus "Back to My Students". No
 * implementation detail (guardian mapping changed, etc.), no mention of
 * session expiration (a distinct, authentication-layer concern).
 */
@Component({
  selector: 'app-lost-access-block',
  standalone: true,
  imports: [MatIconModule, MatButtonModule],
  styles: [`
    .block {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 14px; padding: 64px 24px; text-align: center; color: #6B6255; min-height: 320px;
    }
    mat-icon { font-size: 40px; width: 40px; height: 40px; color: #A3762C; }
    .block p { max-width: 420px; font-size: 0.95rem; margin: 0; color: #1C1A16; }
    button { min-height: 44px; }
    @media (prefers-reduced-motion: reduce) { .block { transition: none; } }
  `],
  template: `
    <div class="block" role="status" aria-live="polite">
      <mat-icon aria-hidden="true">person_off</mat-icon>
      <p>You can no longer access this student.</p>
      <button mat-flat-button color="primary" (click)="backToMyStudents.emit()">Back to My Students</button>
    </div>
  `
})
export class LostAccessBlockComponent {
  backToMyStudents = output<void>();
}
