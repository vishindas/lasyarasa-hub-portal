import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { AssignmentSubmissionQueueApiService } from '../../../core/services/assignment-submission-queue-api.service';
import { SubmissionQueueEntryDTO } from '../../../core/models/assignment.model';
import { AssignmentUiError, toAssignmentUiError } from '../../../core/services/assignment-api-error.util';
import { ClassroomLiteModeService } from '../../../core/services/classroom-lite-mode.service';
import { AssignmentModeBannerComponent } from '../../../shared/assignment/assignment-mode-banner';
import { AssignmentMessageComponent } from '../../../shared/assignment/assignment-message';
import { FullOutageBlockComponent } from '../../../shared/curriculum/full-outage-block';
import { SubmissionQueueRowComponent } from './submission-queue-row';

/** T12 -- submission queue. Read-only + navigation, no mutations here -- always available during WRITE_FROZEN. */
@Component({
  selector: 'app-submission-queue',
  standalone: true,
  imports: [AssignmentModeBannerComponent, AssignmentMessageComponent, FullOutageBlockComponent, SubmissionQueueRowComponent],
  styles: [`.empty { color: #adb5bd; padding: 32px 0; }`],
  template: `
    @if (mode.mode() === 'FULL_OUTAGE') {
      <app-full-outage-block />
    } @else {
      <app-assignment-mode-banner />
      <h2>Validation Queue</h2>
      @if (loading()) {
        <p class="empty">Loading…</p>
      } @else if (error()) {
        <app-assignment-message [error]="error()" (reload)="load()" (retry)="load()" />
      } @else if (entries().length === 0) {
        <p class="empty">Nothing pending review.</p>
      } @else {
        @for (e of entries(); track e.studentAssignmentId) {
          <app-submission-queue-row [entry]="e" (open)="openDetail($event)" />
        }
      }
    }
  `
})
export class SubmissionQueueComponent implements OnInit {
  private api = inject(AssignmentSubmissionQueueApiService);
  private router = inject(Router);
  mode = inject(ClassroomLiteModeService);

  entries = signal<SubmissionQueueEntryDTO[]>([]);
  loading = signal(true);
  error = signal<AssignmentUiError | null>(null);

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.error.set(null);
    this.api.queue(0, 50).subscribe({
      next: page => { this.entries.set(page.content); this.loading.set(false); },
      error: (err: HttpErrorResponse) => { this.error.set(toAssignmentUiError(err)); this.loading.set(false); }
    });
  }

  openDetail(studentAssignmentId: number) {
    this.router.navigate(['/vidya-rasa/assignments/submissions', studentAssignmentId]);
  }
}
