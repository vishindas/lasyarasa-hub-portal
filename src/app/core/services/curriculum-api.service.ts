import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Curriculum, CurriculumVersion, CreateCurriculumRequest, UpdateDraftContentRequest,
  ExpectedRowVersionRequest
} from '../models/curriculum.model';

/** Curriculum + CurriculumVersion endpoints (CurriculumController, 9 total). */
@Injectable({ providedIn: 'root' })
export class CurriculumApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/school/curricula`;

  list(): Observable<Curriculum[]> {
    return this.http.get<Curriculum[]>(this.base);
  }

  get(curriculumId: number): Observable<Curriculum> {
    return this.http.get<Curriculum>(`${this.base}/${curriculumId}`);
  }

  create(body: CreateCurriculumRequest): Observable<CurriculumVersion> {
    return this.http.post<CurriculumVersion>(this.base, body);
  }

  listVersions(curriculumId: number): Observable<CurriculumVersion[]> {
    return this.http.get<CurriculumVersion[]>(`${this.base}/${curriculumId}/versions`);
  }

  getVersion(curriculumId: number, versionId: number): Observable<CurriculumVersion> {
    return this.http.get<CurriculumVersion>(`${this.base}/${curriculumId}/versions/${versionId}`);
  }

  updateDraftContent(curriculumId: number, versionId: number, body: UpdateDraftContentRequest): Observable<CurriculumVersion> {
    return this.http.put<CurriculumVersion>(`${this.base}/${curriculumId}/versions/${versionId}`, body);
  }

  activate(curriculumId: number, versionId: number, body: ExpectedRowVersionRequest): Observable<CurriculumVersion> {
    return this.http.post<CurriculumVersion>(`${this.base}/${curriculumId}/versions/${versionId}/activate`, body);
  }

  archive(curriculumId: number, versionId: number, body: ExpectedRowVersionRequest): Observable<CurriculumVersion> {
    return this.http.post<CurriculumVersion>(`${this.base}/${curriculumId}/versions/${versionId}/archive`, body);
  }

  clone(curriculumId: number, versionId: number, body: ExpectedRowVersionRequest): Observable<CurriculumVersion> {
    return this.http.post<CurriculumVersion>(`${this.base}/${curriculumId}/versions/${versionId}/clone`, body);
  }
}
