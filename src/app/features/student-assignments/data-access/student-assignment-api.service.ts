import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import {
  AttemptDTO,
  DraftResponseDTO,
  SaveDraftRequest,
  StudentAssignmentDetailDTO,
  StudentAssignmentSummaryDTO,
  SubmitRequest
} from './student-assignment.model';

/**
 * Thin wrapper over StudentAssignmentController's 7 endpoints
 * (/api/account/students/{studentId}/learning/assignments/**, rasa-ai
 * main@536740d). No answer-key-bearing type ever passes through this
 * service -- see student-assignment.model.ts's header comment.
 */
@Injectable({ providedIn: 'root' })
export class StudentAssignmentApiService {
  private http = inject(HttpClient);

  private base(studentId: number): string {
    return `${environment.apiUrl}/account/students/${studentId}/learning/assignments`;
  }

  list(studentId: number) {
    return this.http.get<StudentAssignmentSummaryDTO[]>(this.base(studentId));
  }

  getDetail(studentId: number, studentAssignmentId: number) {
    return this.http.get<StudentAssignmentDetailDTO>(`${this.base(studentId)}/${studentAssignmentId}`);
  }

  getAttemptHistory(studentId: number, studentAssignmentId: number) {
    return this.http.get<AttemptDTO[]>(`${this.base(studentId)}/${studentAssignmentId}/attempts`);
  }

  listDrafts(studentId: number, studentAssignmentId: number) {
    return this.http.get<DraftResponseDTO[]>(`${this.base(studentId)}/${studentAssignmentId}/draft`);
  }

  saveDraft(studentId: number, studentAssignmentId: number, questionId: number, body: SaveDraftRequest) {
    return this.http.put<DraftResponseDTO>(`${this.base(studentId)}/${studentAssignmentId}/draft/${questionId}`, body);
  }

  submit(studentId: number, studentAssignmentId: number, body: SubmitRequest) {
    return this.http.post<StudentAssignmentDetailDTO>(`${this.base(studentId)}/${studentAssignmentId}/submit`, body);
  }

  resubmit(studentId: number, studentAssignmentId: number, body: SubmitRequest) {
    return this.http.post<StudentAssignmentDetailDTO>(`${this.base(studentId)}/${studentAssignmentId}/resubmit`, body);
  }
}
