import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AssignmentCapabilityDTO } from '../models/assignment.model';

/** Wraps AssignmentCapabilityController's 1 endpoint. Thin HTTP wrapper only -- see assignment-capability-state.service.ts for the shared reactive state built on top of this. */
@Injectable({ providedIn: 'root' })
export class AssignmentCapabilityApiService {
  private http = inject(HttpClient);
  private url = `${environment.apiUrl}/school/assignments/capability`;

  get(): Observable<AssignmentCapabilityDTO> {
    return this.http.get<AssignmentCapabilityDTO>(this.url);
  }
}
