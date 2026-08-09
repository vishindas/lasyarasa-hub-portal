import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { CurrencyService } from './currency.service';

describe('CurrencyService', () => {
  let service: CurrencyService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(CurrencyService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('defaults to INR before load() resolves', () => {
    expect(service.currency()).toBe('INR');
  });

  it('load() fetches the currency and updates the signal', () => {
    service.load();
    const req = httpMock.expectOne(`${environment.apiUrl}/school/settings/currency`);
    expect(req.request.method).toBe('GET');
    req.flush({ currency: 'USD' });
    expect(service.currency()).toBe('USD');
  });
});
