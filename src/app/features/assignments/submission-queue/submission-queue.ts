import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { AssignmentSubmissionQueueApiService } from '../../../core/services/assignment-submission-queue-api.service';
import { SubmissionQueueEntryDTO } from '../../../core/models/assignment.model';
import { AssignmentUiError, toAssignmentUiError } from '../../../core/services/assignment-api-error.util';
import { SubmissionQueueRowComponent } from './submission-queue-row';

/** T12 -- submission queue, enriched (names/class/template title) via the widened SubmissionQueueEntryDTO join. No rowVersion here by design -- see StaffSubmissionDetailDTO. */
@Component({
  selector: 'app-submission-queue',
  standalone: true,
  imports: [SubmissionQueueRowComponent],
  styles: [`.empty { color: #adb5bd; padding: 32px 0; }`],
  template: `
    <h2>Validation Queue</h2>
    @if (loading()) {
      <p class="empty">Loading…</p>
    } @else if (error()) {
      <p style="color:#b91c1c">{{ error()!.message }}</p>
    } @else if (entries().length === 0) {
      <p class="empty">Nothing pending review.</p>
    } @else {
      @for (e of entries(); track e.studentAssignmentId) {
        <app-submission-queue-row [entry]="e" (open)="openDetail($event)" />
      }
    }
  `
})
export class SubmissionQueueComponent implements OnInit {
  private api = inject(AssignmentSubmissionQueueApiService);
  private router = inject(Router);

  entries = signal<SubmissionQueueEntryDTO[]>([]);
  loading = signal(true);
  error = signal<AssignmentUiError | null>(null);

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.api.queue(0, 50).subscribe({
      next: page => { this.entries.set(page.content); this.loading.set(false); },
      error: (err: HttpErrorResponse) => { this.error.set(toAssignmentUiError(err)); this.loading.set(false); }
    });
  }

  openDetail(studentAssignmentId: number) {
    this.router.navigate(['/vidya-rasa/assignments/submissions', studentAssignmentId]);
  }
}
