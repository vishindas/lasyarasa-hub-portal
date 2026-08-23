import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AssignInstanceRequest, AssignmentInstanceDTO, AssignmentInstanceSummaryDTO,
  AssignmentInstanceDetailDTO, AssignmentInstanceStudentRollupDTO, AssignmentLateEnrolleeCandidateDTO
} from '../models/assignment.model';
import { Page } from './assignment-template-api.service';

/** Wraps all 7 endpoints of AssignmentInstanceController -- none of the instance family carries isCorrect. */
@Injectable({ providedIn: 'root' })
export class AssignmentInstanceApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/school/assignments/instances`;

  assign(body: AssignInstanceRequest): Observable<AssignmentInstanceDTO> {
    return this.http.post<AssignmentInstanceDTO>(this.base, body);
  }

  list(classId: number | null, page: number, size: number): Observable<Page<AssignmentInstanceSummaryDTO>> {
    let url = `${this.base}?page=${page}&size=${size}`;
    if (classId != null) url += `&classId=${classId}`;
    return this.http.get<Page<AssignmentInstanceSummaryDTO>>(url);
  }

  get(instanceId: number): Observable<AssignmentInstanceDetailDTO> {
    return this.http.get<AssignmentInstanceDetailDTO>(`${this.base}/${instanceId}`);
  }

  students(instanceId: number): Observable<AssignmentInstanceStudentRollupDTO[]> {
    return this.http.get<AssignmentInstanceStudentRollupDTO[]>(`${this.base}/${instanceId}/students`);
  }

  lateEnrollees(instanceId: number): Observable<AssignmentLateEnrolleeCandidateDTO[]> {
    return this.http.get<AssignmentLateEnrolleeCandidateDTO[]>(`${this.base}/${instanceId}/late-enrollees`);
  }

  issue(instanceId: number, studentId: number): Observable<void> {
    return this.http.post<void>(`${this.base}/${instanceId}/students/${studentId}/issue`, {});
  }

  skip(instanceId: number, studentId: number): Observable<void> {
    return this.http.post<void>(`${this.base}/${instanceId}/students/${studentId}/skip`, {});
  }
}
