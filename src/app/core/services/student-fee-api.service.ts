import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { StudentFeeDTO } from '../models/student-fee.model';

/**
 * D3's single deployed endpoint: GET /api/account/students/{studentId}/fees.
 * Not under .../learning/** (same as StudentAccessApiService's My Students
 * list) -- fees is its own feature area, unrelated to the classroom-lite
 * studentLearningEntryEnabled gate.
 */
@Injectable({ providedIn: 'root' })
export class StudentFeeApiService {
  private http = inject(HttpClient);

  fees(studentId: number) {
    return this.http.get<StudentFeeDTO[]>(`${environment.apiUrl}/account/students/${studentId}/fees`);
  }
}
