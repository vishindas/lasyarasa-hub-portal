import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import {
  ClassInfoDTO,
  LearningPathDTO,
  ModuleDetailDTO,
  StudentClassDTO,
  StudentLearningHomeDTO,
  StudentLessonDetailDTO
} from '../models/student-learning.model';

/**
 * Thin wrapper over the six deployed Slice 11 GET endpoints
 * (/api/account/students/{studentId}/learning/**). No write methods exist
 * here because Slice 11 has none -- this service must never grow one for
 * assignments (Slice 14's territory, correction 3).
 */
@Injectable({ providedIn: 'root' })
export class StudentLearningApiService {
  private http = inject(HttpClient);

  private base(studentId: number): string {
    return `${environment.apiUrl}/account/students/${studentId}/learning`;
  }

  classes(studentId: number) {
    return this.http.get<StudentClassDTO[]>(`${this.base(studentId)}/classes`);
  }

  home(studentId: number, classId?: number) {
    let url = `${this.base(studentId)}/home`;
    if (classId != null) {
      url += `?classId=${encodeURIComponent(classId)}`;
    }
    return this.http.get<StudentLearningHomeDTO>(url);
  }

  learningPath(studentId: number, classId: number) {
    return this.http.get<LearningPathDTO>(`${this.base(studentId)}/classes/${classId}/learning-path`);
  }

  moduleDetail(studentId: number, classId: number, moduleId: number) {
    return this.http.get<ModuleDetailDTO>(`${this.base(studentId)}/classes/${classId}/modules/${moduleId}`);
  }

  lessonDetail(studentId: number, classId: number, moduleId: number, lessonId: number) {
    return this.http.get<StudentLessonDetailDTO>(
      `${this.base(studentId)}/classes/${classId}/modules/${moduleId}/lessons/${lessonId}`
    );
  }

  classInfo(studentId: number, classId: number) {
    return this.http.get<ClassInfoDTO>(`${this.base(studentId)}/classes/${classId}/class-info`);
  }
}
