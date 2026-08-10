import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ValidateYouTubeUrlRequest, ValidateYouTubeUrlResponse } from '../models/curriculum.model';

/** Stateless YouTube URL classification (YouTubeUrlValidationController, 1 endpoint) -- no lesson row is read or written. */
@Injectable({ providedIn: 'root' })
export class YouTubeUrlValidationApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/school/curricula/lessons`;

  validate(url: string): Observable<ValidateYouTubeUrlResponse> {
    const body: ValidateYouTubeUrlRequest = { url };
    return this.http.post<ValidateYouTubeUrlResponse>(`${this.base}/validate-youtube-url`, body);
  }
}
