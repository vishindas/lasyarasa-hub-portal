import { Component, input } from '@angular/core';
import { AssignmentInstanceStudentRollupDTO } from '../../../core/models/assignment.model';

/**
 * T10 per-student table. Issued/skipped students remain listed even after
 * their enrollment later becomes inactive (server-guaranteed by the
 * three-source union query) -- currentlyActiveEnrollment is display-only,
 * never part of the ISSUED/SKIPPED inclusion predicate on the client either.
 */
@Component({
  selector: 'app-student-rollup-table',
  standalone: true,
  imports: [],
  styles: [`
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 8px 12px; border-bottom: 1px solid #eee; }
    .muted { color: #adb5bd; font-size: 0.8rem; }
  `],
  template: `
    <table>
      <thead><tr><th>Student</th><th>Participation</th><th>Submission status</th><th>Attempt</th></tr></thead>
      <tbody>
        @for (s of students(); track s.studentId) {
          <tr>
            <td>{{ s.firstName }} {{ s.lastName }} @if (!s.currentlyActiveEnrollment) { <span class="muted">(inactive)</span> }</td>
            <td>{{ s.participationState }}</td>
            <td>{{ s.studentAssignmentStatus ?? '—' }}</td>
            <td>{{ s.attemptNumber ?? '—' }}</td>
          </tr>
        }
      </tbody>
    </table>
  `
})
export class StudentRollupTableComponent {
  students = input.required<AssignmentInstanceStudentRollupDTO[]>();
}
