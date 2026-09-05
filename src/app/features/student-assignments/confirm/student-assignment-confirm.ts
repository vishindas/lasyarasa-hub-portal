import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

/** S9 -- success screen after Submit/Resubmit. */
@Component({
  selector: 'app-student-assignment-confirm',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule],
  styles: [`
    :host { display: block; max-width: 560px; margin: 0 auto; padding: 64px 20px; text-align: center; }
    mat-icon.success { font-size: 48px; width: 48px; height: 48px; color: var(--sp-tone-positive-text, #065f46); margin-bottom: 12px; }
    /* UX-5: Fraunces retired (Deliverable 3), matching Provider's page-header h2 pattern. */
    h1 { font-size: 1.5rem; font-weight: 600; color: var(--sp-text, #1a1f36); margin: 0 0 12px; }
    p { color: var(--sp-text-muted, #52596b); margin: 0 0 24px; }
    a[mat-flat-button] { min-height: 44px; }
  `],
  template: `
    <mat-icon class="success" aria-hidden="true">check_circle</mat-icon>
    <h1 tabindex="-1">{{ resubmitted() ? 'Resubmitted' : 'Submitted' }}</h1>
    <p>Your teacher will review it and you'll see the result under Assignments.</p>
    <a mat-flat-button color="primary" [routerLink]="['/my-students', studentId(), 'assignments']" [queryParams]="{ tab: 'awaiting' }">Back to Assignments</a>
  `
})
export class StudentAssignmentConfirmComponent implements OnInit {
  private route = inject(ActivatedRoute);
  studentId = signal<number>(0);
  resubmitted = signal(false);

  ngOnInit() {
    this.studentId.set(Number(this.route.snapshot.paramMap.get('studentId')));
    this.resubmitted.set(this.route.snapshot.queryParamMap.get('resubmitted') === '1');
  }
}
