import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CurrencyService {
  currency = signal<string>('INR');

  constructor(private http: HttpClient) {}

  load() {
    this.http.get<{ currency: string }>(`${environment.apiUrl}/school/settings/currency`)
      .subscribe({ next: r => this.currency.set(r.currency) });
  }
}
