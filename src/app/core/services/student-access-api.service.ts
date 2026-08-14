import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { StudentAccessDTO } from '../models/student-learning.model';

/**
 * The pre-existing GET /account/students ("My Students", R2E-I-4) endpoint,
 * extracted from MyStudentsComponent's own inline HttpClient call so
 * StudentSwitcherComponent (Slice 12) can reuse it without duplicating the
 * request. Behavior is unchanged -- same URL, same shape, no new params.
 */
@Injectable({ providedIn: 'root' })
export class StudentAccessApiService {
  private http = inject(HttpClient);

  list() {
    return this.http.get<StudentAccessDTO[]>(`${environment.apiUrl}/account/students`);
  }
}
