import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Lesson, CreateLessonRequest, UpdateLessonRequest, ReorderLessonsRequest,
  PublishLessonRequest, RepairLessonVideoRequest, ExpectedRowVersionRequest
} from '../models/curriculum.model';

/** Lesson endpoints (CurriculumLessonController, 9 total). */
@Injectable({ providedIn: 'root' })
export class LessonApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/school/curricula/versions/modules`;

  list(moduleId: number): Observable<Lesson[]> {
    return this.http.get<Lesson[]>(`${this.base}/${moduleId}/lessons`);
  }

  create(moduleId: number, body: CreateLessonRequest): Observable<Lesson> {
    return this.http.post<Lesson>(`${this.base}/${moduleId}/lessons`, body);
  }

  update(lessonId: number, body: UpdateLessonRequest): Observable<Lesson> {
    return this.http.put<Lesson>(`${this.base}/lessons/${lessonId}`, body);
  }

  reorder(moduleId: number, body: ReorderLessonsRequest): Observable<Lesson[]> {
    return this.http.post<Lesson[]>(`${this.base}/${moduleId}/lessons/reorder`, body);
  }

  publish(lessonId: number, body: PublishLessonRequest): Observable<Lesson> {
    return this.http.post<Lesson>(`${this.base}/lessons/${lessonId}/publish`, body);
  }

  unpublish(lessonId: number, body: ExpectedRowVersionRequest): Observable<Lesson> {
    return this.http.post<Lesson>(`${this.base}/lessons/${lessonId}/unpublish`, body);
  }

  archive(lessonId: number, body: ExpectedRowVersionRequest): Observable<Lesson> {
    return this.http.post<Lesson>(`${this.base}/lessons/${lessonId}/archive`, body);
  }

  repairVideo(lessonId: number, body: RepairLessonVideoRequest): Observable<Lesson> {
    return this.http.post<Lesson>(`${this.base}/lessons/${lessonId}/repair-video`, body);
  }

  /** Admin-triggered only. Invoked as a Preview preflight for a PUBLISHED VIDEO lesson currently marked AVAILABLE -- never merely by opening the Editor (Slice 9 binding decision 3). */
  checkVideo(lessonId: number, body: ExpectedRowVersionRequest): Observable<Lesson> {
    return this.http.post<Lesson>(`${this.base}/lessons/${lessonId}/check-video`, body);
  }
}
