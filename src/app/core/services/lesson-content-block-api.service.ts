import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  LessonContentBlock, CreateLessonContentBlockRequest, UpdateLessonContentBlockRequest,
  DeleteLessonContentBlockRequest, ReorderLessonContentBlocksRequest, CheckLessonContentBlockVideoRequest,
  RepairLessonContentBlockVideoRequest, LessonContentBlockMutationResponse, LessonContentBlockListMutationResponse,
  Lesson
} from '../models/curriculum.model';

/** Lesson content block endpoints (CurriculumLessonContentBlockController, MC-2 API). Mirrors LessonApiService's own shape one level down. */
@Injectable({ providedIn: 'root' })
export class LessonContentBlockApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/school/curricula/versions/modules/lessons`;

  list(lessonId: number): Observable<LessonContentBlock[]> {
    return this.http.get<LessonContentBlock[]>(`${this.base}/${lessonId}/blocks`);
  }

  create(lessonId: number, body: CreateLessonContentBlockRequest): Observable<LessonContentBlockMutationResponse> {
    return this.http.post<LessonContentBlockMutationResponse>(`${this.base}/${lessonId}/blocks`, body);
  }

  update(lessonId: number, blockId: number, body: UpdateLessonContentBlockRequest): Observable<LessonContentBlockMutationResponse> {
    return this.http.put<LessonContentBlockMutationResponse>(`${this.base}/${lessonId}/blocks/${blockId}`, body);
  }

  /** DELETE with a body -- HttpClient.delete()'s options param is where the request body goes. */
  delete(lessonId: number, blockId: number, body: DeleteLessonContentBlockRequest): Observable<Lesson> {
    return this.http.delete<Lesson>(`${this.base}/${lessonId}/blocks/${blockId}`, { body });
  }

  reorder(lessonId: number, body: ReorderLessonContentBlocksRequest): Observable<LessonContentBlockListMutationResponse> {
    return this.http.post<LessonContentBlockListMutationResponse>(`${this.base}/${lessonId}/blocks/reorder`, body);
  }

  checkVideo(lessonId: number, blockId: number, body: CheckLessonContentBlockVideoRequest): Observable<LessonContentBlockMutationResponse> {
    return this.http.post<LessonContentBlockMutationResponse>(`${this.base}/${lessonId}/blocks/${blockId}/check-video`, body);
  }

  repairVideo(lessonId: number, blockId: number, body: RepairLessonContentBlockVideoRequest): Observable<LessonContentBlockMutationResponse> {
    return this.http.post<LessonContentBlockMutationResponse>(`${this.base}/${lessonId}/blocks/${blockId}/repair-video`, body);
  }
}
