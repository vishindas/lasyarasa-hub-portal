import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  EnablePortalAccessRequest, EnablePortalAccessResponse,
  InviteExistingStudentAccessRequest, InviteExistingStudentAccessResponse,
  PortalAccessStatusResponse
} from '../models/portal-access.model';

/**
 * Portal Access Onboarding Slice 3. Owns both endpoints the Portal Access
 * card's decision tree can select between — never chosen by a vague
 * heuristic, always by whether a usable stored email exists for the exact
 * target (see PortalAccessCard):
 *  - invite(): POST /invite-access — has-stored-email cohort, unchanged
 *    endpoint from before this slice.
 *  - enableAccess(): POST /enable-portal-access — no-usable-stored-email
 *    cohort (Slice 2).
 *  - getStatus(): GET /portal-access-status — the sole authoritative read
 *    model (Slice 3); never inferred from student/guardian stored email or
 *    reconstructed from a prior enableAccess()/invite() response.
 */
@Injectable({ providedIn: 'root' })
export class PortalAccessApiService {
  private http = inject(HttpClient);

  getStatus(studentId: number): Observable<PortalAccessStatusResponse> {
    return this.http.get<PortalAccessStatusResponse>(
      `${environment.apiUrl}/school/v2/students/${studentId}/portal-access-status`);
  }

  invite(studentId: number, body: InviteExistingStudentAccessRequest): Observable<InviteExistingStudentAccessResponse> {
    return this.http.post<InviteExistingStudentAccessResponse>(
      `${environment.apiUrl}/school/v2/students/${studentId}/invite-access`, body);
  }

  enableAccess(studentId: number, body: EnablePortalAccessRequest): Observable<EnablePortalAccessResponse> {
    return this.http.post<EnablePortalAccessResponse>(
      `${environment.apiUrl}/school/v2/students/${studentId}/enable-portal-access`, body);
  }
}
