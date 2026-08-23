import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SubmissionQueueEntryDTO } from '../models/assignment.model';
import { Page } from './assignment-template-api.service';

/** Wraps the 1 answer-key-free endpoint of AssignmentSubmissionQueueController (out of its 4 total): GET / (queue). The remaining 3 (detail/validate/request-revision) are wrapped by features/assignments/data-access/assignment-submission-review-api.service.ts. */
@Injectable({ providedIn: 'root' })
export class AssignmentSubmissionQueueApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/school/assignments/submissions`;

  queue(page: number, size: number): Observable<Page<SubmissionQueueEntryDTO>> {
    return this.http.get<Page<SubmissionQueueEntryDTO>>(`${this.base}?page=${page}&size=${size}`);
  }
}
