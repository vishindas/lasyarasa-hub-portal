import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { StaffSubmissionDetailDTO, ValidateRequest, RequestRevisionRequest } from './assignment-staff.model';

/** Wraps the 3 answer-key-bearing endpoints of AssignmentSubmissionQueueController (out of its 4 total): getDetail, validate, request-revision. */
@Injectable({ providedIn: 'root' })
export class AssignmentSubmissionReviewApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/school/assignments/submissions`;

  getDetail(studentAssignmentId: number): Observable<StaffSubmissionDetailDTO> {
    return this.http.get<StaffSubmissionDetailDTO>(`${this.base}/${studentAssignmentId}`);
  }

  validate(studentAssignmentId: number, body: ValidateRequest): Observable<void> {
    return this.http.post<void>(`${this.base}/${studentAssignmentId}/validate`, body);
  }

  requestRevision(studentAssignmentId: number, body: RequestRevisionRequest): Observable<void> {
    return this.http.post<void>(`${this.base}/${studentAssignmentId}/request-revision`, body);
  }
}
