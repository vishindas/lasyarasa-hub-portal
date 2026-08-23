import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AssignmentInstanceApiService } from '../../../core/services/assignment-instance-api.service';
import { AssignmentInstanceSummaryDTO } from '../../../core/models/assignment.model';
import { AssignmentUiError, toAssignmentUiError } from '../../../core/services/assignment-api-error.util';
import { ClassroomLiteModeService } from '../../../core/services/classroom-lite-mode.service';
import { AssignmentModeBannerComponent } from '../../../shared/assignment/assignment-mode-banner';
import { AssignmentMessageComponent } from '../../../shared/assignment/assignment-message';
import { FullOutageBlockComponent } from '../../../shared/curriculum/full-outage-block';
import { StatusChipAssignmentComponent } from '../../../shared/assignment/status-chip-assignment';

/** T10 -- instance/status list. Read-only + navigation, no mutations here -- always available during WRITE_FROZEN. */
@Component({
  selector: 'app-instance-list',
  standalone: true,
  imports: [DatePipe, MatButtonModule, MatIconModule, AssignmentModeBannerComponent, AssignmentMessageComponent, FullOutageBlockComponent, StatusChipAssignmentComponent],
  styles: [`
    .row { display: flex; align-items: center; justify-content: space-between; padding: 12px 4px; border-bottom: 1px solid #eee; gap: 12px; }
    .titles { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .sub { color: #6c757d; font-size: 0.82rem; }
    .empty { color: #adb5bd; padding: 32px 0; }
  `],
  template: `
    @if (mode.mode() === 'FULL_OUTAGE') {
      <app-full-outage-block />
    } @else {
      <app-assignment-mode-banner />
      <h2>Instances</h2>
      @if (loading()) {
        <p class="empty">Loading…</p>
      } @else if (error()) {
        <app-assignment-message [error]="error()" (reload)="load()" (retry)="load()" />
      } @else if (instances().length === 0) {
        <p class="empty">No assignment instances yet.</p>
      } @else {
        @for (i of instances(); track i.id) {
          <div class="row">
            <div class="titles">
              <span>{{ i.templateTitle }}</span>
              <span class="sub">{{ i.className }} · due {{ i.dueAt | date: 'mediumDate' }}</span>
            </div>
            <app-status-chip-assignment [state]="i.status" />
            <button mat-stroked-button type="button" (click)="open(i.id)">Open <mat-icon aria-hidden="true">arrow_forward</mat-icon></button>
          </div>
        }
      }
    }
  `
})
export class InstanceListComponent implements OnInit {
  private api = inject(AssignmentInstanceApiService);
  private router = inject(Router);
  mode = inject(ClassroomLiteModeService);

  instances = signal<AssignmentInstanceSummaryDTO[]>([]);
  loading = signal(true);
  error = signal<AssignmentUiError | null>(null);

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.error.set(null);
    this.api.list(null, 0, 50).subscribe({
      next: page => { this.instances.set(page.content); this.loading.set(false); },
      error: (err: HttpErrorResponse) => { this.error.set(toAssignmentUiError(err)); this.loading.set(false); }
    });
  }

  open(instanceId: number) {
    this.router.navigate(['/vidya-rasa/assignments/instances', instanceId]);
  }
}
