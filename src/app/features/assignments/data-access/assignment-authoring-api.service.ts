import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  CreateQuestionRequest, UpdateQuestionRequest, AssignmentExpectedRowVersionRequest,
  ReorderQuestionsRequest, ReorderOptionsRequest, UpdateTemplateVersionTitleRequest
} from '../../../core/models/assignment.model';
import {
  AssignmentTemplateVersionDTO, AssignmentQuestionDTO, AssignmentQuestionOptionDTO,
  CreateOptionRequest, UpdateOptionRequest
} from './assignment-staff.model';

/**
 * Wraps the 11 answer-key-bearing endpoints of AssignmentTemplateController
 * (out of its 18 total): startDraft (returns AssignmentTemplateVersionDTO),
 * getVersion, updateTitle, question CRUD, option CRUD, reorderQuestions,
 * reorderOptions. Imports request types from core/models/assignment.model.ts
 * (features -> core, valid) alongside its own co-located answer-key-bearing
 * model (assignment-staff.model.ts). See Slice 15 Plan v2.1.2 §8.2/§8.3.
 */
@Injectable({ providedIn: 'root' })
export class AssignmentAuthoringApiService {
  private http = inject(HttpClient);
  private templatesBase = `${environment.apiUrl}/school/assignments/templates`;
  private versionsBase = `${environment.apiUrl}/school/assignments/versions`;
  private questionsBase = `${environment.apiUrl}/school/assignments/questions`;
  private optionsBase = `${environment.apiUrl}/school/assignments/options`;

  startDraft(templateId: number): Observable<AssignmentTemplateVersionDTO> {
    return this.http.post<AssignmentTemplateVersionDTO>(`${this.templatesBase}/${templateId}/draft`, {});
  }

  getVersion(versionId: number): Observable<AssignmentTemplateVersionDTO> {
    return this.http.get<AssignmentTemplateVersionDTO>(`${this.versionsBase}/${versionId}`);
  }

  updateTitle(versionId: number, body: UpdateTemplateVersionTitleRequest): Observable<AssignmentTemplateVersionDTO> {
    return this.http.put<AssignmentTemplateVersionDTO>(`${this.versionsBase}/${versionId}/title`, body);
  }

  createQuestion(versionId: number, body: CreateQuestionRequest): Observable<AssignmentQuestionDTO> {
    return this.http.post<AssignmentQuestionDTO>(`${this.versionsBase}/${versionId}/questions`, body);
  }

  updateQuestion(questionId: number, body: UpdateQuestionRequest): Observable<AssignmentQuestionDTO> {
    return this.http.put<AssignmentQuestionDTO>(`${this.questionsBase}/${questionId}`, body);
  }

  deleteQuestion(questionId: number, body: AssignmentExpectedRowVersionRequest): Observable<void> {
    return this.http.request<void>('delete', `${this.questionsBase}/${questionId}`, { body });
  }

  createOption(questionId: number, body: CreateOptionRequest): Observable<AssignmentQuestionOptionDTO> {
    return this.http.post<AssignmentQuestionOptionDTO>(`${this.questionsBase}/${questionId}/options`, body);
  }

  updateOption(optionId: number, body: UpdateOptionRequest): Observable<AssignmentQuestionOptionDTO> {
    return this.http.put<AssignmentQuestionOptionDTO>(`${this.optionsBase}/${optionId}`, body);
  }

  deleteOption(optionId: number, body: AssignmentExpectedRowVersionRequest): Observable<void> {
    return this.http.request<void>('delete', `${this.optionsBase}/${optionId}`, { body });
  }

  reorderQuestions(versionId: number, body: ReorderQuestionsRequest): Observable<AssignmentQuestionDTO[]> {
    return this.http.put<AssignmentQuestionDTO[]>(`${this.versionsBase}/${versionId}/questions/reorder`, body);
  }

  reorderOptions(questionId: number, body: ReorderOptionsRequest): Observable<AssignmentQuestionOptionDTO[]> {
    return this.http.put<AssignmentQuestionOptionDTO[]>(`${this.questionsBase}/${questionId}/options/reorder`, body);
  }
}
