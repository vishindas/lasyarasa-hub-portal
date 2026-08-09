import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CurriculumModule, CreateModuleRequest, UpdateModuleRequest, ReorderModulesRequest,
  ExpectedRowVersionRequest
} from '../models/curriculum.model';

/** CurriculumModule endpoints (CurriculumModuleController, 6 total). */
@Injectable({ providedIn: 'root' })
export class CurriculumModuleApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/school/curricula/versions`;

  list(versionId: number): Observable<CurriculumModule[]> {
    return this.http.get<CurriculumModule[]>(`${this.base}/${versionId}/modules`);
  }

  create(versionId: number, body: CreateModuleRequest): Observable<CurriculumModule> {
    return this.http.post<CurriculumModule>(`${this.base}/${versionId}/modules`, body);
  }

  update(moduleId: number, body: UpdateModuleRequest): Observable<CurriculumModule> {
    return this.http.put<CurriculumModule>(`${this.base}/modules/${moduleId}`, body);
  }

  reorder(versionId: number, body: ReorderModulesRequest): Observable<CurriculumModule[]> {
    return this.http.post<CurriculumModule[]>(`${this.base}/${versionId}/modules/reorder`, body);
  }

  publish(moduleId: number, body: ExpectedRowVersionRequest): Observable<CurriculumModule> {
    return this.http.post<CurriculumModule>(`${this.base}/modules/${moduleId}/publish`, body);
  }

  archive(moduleId: number, body: ExpectedRowVersionRequest): Observable<CurriculumModule> {
    return this.http.post<CurriculumModule>(`${this.base}/modules/${moduleId}/archive`, body);
  }
}
