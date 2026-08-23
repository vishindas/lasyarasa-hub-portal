import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AssignmentTemplateDTO, AssignmentTemplateSummaryDTO, AssignmentEligibleClassDTO,
  CreateAssignmentTemplateRequest, AssignmentExpectedRowVersionRequest
} from '../models/assignment.model';

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

/**
 * Wraps the 7 answer-key-free endpoints of AssignmentTemplateController
 * (out of its 18 total). The remaining 11 (startDraft, getVersion,
 * updateTitle, question/option CRUD, reorder) return or accept the
 * answer-key-bearing AssignmentTemplateVersionDTO graph and are wrapped
 * instead by features/assignments/data-access/assignment-authoring-api.service.ts
 * -- see Slice 15 Plan v2.1.2 §8.3. This service must never import from
 * features/**.
 */
@Injectable({ providedIn: 'root' })
export class AssignmentTemplateApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/school/assignments/templates`;

  create(body: CreateAssignmentTemplateRequest): Observable<AssignmentTemplateDTO> {
    return this.http.post<AssignmentTemplateDTO>(this.base, body);
  }

  list(moduleId: number | null, page: number, size: number): Observable<Page<AssignmentTemplateSummaryDTO>> {
    let url = `${this.base}?page=${page}&size=${size}`;
    if (moduleId != null) url += `&moduleId=${moduleId}`;
    return this.http.get<Page<AssignmentTemplateSummaryDTO>>(url);
  }

  get(templateId: number): Observable<AssignmentTemplateDTO> {
    return this.http.get<AssignmentTemplateDTO>(`${this.base}/${templateId}`);
  }

  discardDraft(templateId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${templateId}/draft`);
  }

  publish(templateId: number, body: AssignmentExpectedRowVersionRequest): Observable<AssignmentTemplateDTO> {
    return this.http.post<AssignmentTemplateDTO>(`${this.base}/${templateId}/publish`, body);
  }

  archive(templateId: number, body: AssignmentExpectedRowVersionRequest): Observable<AssignmentTemplateDTO> {
    return this.http.post<AssignmentTemplateDTO>(`${this.base}/${templateId}/archive`, body);
  }

  eligibleClasses(templateId: number): Observable<AssignmentEligibleClassDTO[]> {
    return this.http.get<AssignmentEligibleClassDTO[]>(`${this.base}/${templateId}/eligible-classes`);
  }
}
