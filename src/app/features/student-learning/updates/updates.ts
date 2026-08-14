import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/**
 * Part I.7/correction 4: no teacher-updates backend exists or is
 * fabricated. This is the already-approved light stub -- a working nav
 * destination with minimal, honest content. Full page-specific design is
 * explicitly deferred to a later, separately-scoped slice (Part IX
 * traceability row for §6.7).
 */
@Component({
  selector: 'app-updates',
  standalone: true,
  imports: [MatIconModule],
  styles: [`
    :host { display: block; max-width: 640px; margin: 0 auto; padding: 24px 20px 48px; }
    h1 { font-family: Fraunces, Georgia, serif; font-size: 1.4rem; color: #1C1A16; margin: 0 0 16px; }
    .stub { display: flex; flex-direction: column; align-items: center; gap: 10px; text-align: center; color: #6B6255; padding: 48px 16px; }
    mat-icon { font-size: 32px; width: 32px; height: 32px; color: #A3762C; }
  `],
  template: `
    <h1 tabindex="-1">Updates</h1>
    <div class="stub">
      <mat-icon aria-hidden="true">campaign</mat-icon>
      <p>Class updates aren't available yet.</p>
    </div>
  `
})
export class UpdatesComponent {}
