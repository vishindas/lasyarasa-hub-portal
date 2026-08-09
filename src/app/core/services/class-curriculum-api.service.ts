import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ClassCurriculumAssignment, ClassModuleState, AssignCurriculumRequest, ExpectedRowVersionRequest,
  WithdrawModuleRequest, ChangeCurriculumPreviewResponse, ChangeCurriculumConfirmRequest
} from '../models/curriculum.model';

/** ClassCurriculumAssignment + ClassModuleState + Change-Curriculum endpoints (ClassCurriculumController, 9 total). */
@Injectable({ providedIn: 'root' })
export class ClassCurriculumApiService {
  private http = inject(HttpClient);
  private base = (classId: number) => `${environment.apiUrl}/school/classes/${classId}`;

  current(classId: number): Observable<ClassCurriculumAssignment> {
    return this.http.get<ClassCurriculumAssignment>(`${this.base(classId)}/curriculum-assignment`);
  }

  currentModuleStates(classId: number): Observable<ClassModuleState[]> {
    return this.http.get<ClassModuleState[]>(`${this.base(classId)}/curriculum-assignment/module-states`);
  }

  assign(classId: number, body: AssignCurriculumRequest): Observable<ClassCurriculumAssignment> {
    return this.http.post<ClassCurriculumAssignment>(`${this.base(classId)}/curriculum-assignment`, body);
  }

  release(classId: number, stateId: number, body: ExpectedRowVersionRequest): Observable<ClassModuleState> {
    return this.http.post<ClassModuleState>(`${this.base(classId)}/modules/${stateId}/release`, body);
  }

  relock(classId: number, stateId: number, body: ExpectedRowVersionRequest): Observable<ClassModuleState> {
    return this.http.post<ClassModuleState>(`${this.base(classId)}/modules/${stateId}/relock`, body);
  }

  complete(classId: number, stateId: number, body: ExpectedRowVersionRequest): Observable<ClassModuleState> {
    return this.http.post<ClassModuleState>(`${this.base(classId)}/modules/${stateId}/complete`, body);
  }

  withdraw(classId: number, stateId: number, body: WithdrawModuleRequest): Observable<ClassModuleState> {
    return this.http.post<ClassModuleState>(`${this.base(classId)}/modules/${stateId}/withdraw`, body);
  }

  changePreview(classId: number, targetCurriculumVersionId: number): Observable<ChangeCurriculumPreviewResponse> {
    const params = new HttpParams().set('targetCurriculumVersionId', targetCurriculumVersionId);
    return this.http.get<ChangeCurriculumPreviewResponse>(`${this.base(classId)}/curriculum-assignment/change-preview`, { params });
  }

  changeConfirm(classId: number, body: ChangeCurriculumConfirmRequest): Observable<ClassCurriculumAssignment> {
    return this.http.post<ClassCurriculumAssignment>(`${this.base(classId)}/curriculum-assignment/change-confirm`, body);
  }
}
