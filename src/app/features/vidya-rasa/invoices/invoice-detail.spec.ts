import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, RouterLink, provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { Invoice } from '../../../core/models/invoice.model';
import { InvoiceDetailComponent } from './invoice-detail';

describe('InvoiceDetailComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [InvoiceDetailComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => '108' } } } }
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('links the student-name portion of a line-item description to the student details page', () => {
    const fixture = TestBed.createComponent(InvoiceDetailComponent);
    fixture.detectChanges();

    httpMock.expectOne(`${environment.apiUrl}/school/invoices/108`).flush({
      id: 108,
      invoiceNumber: 'INV-108',
      period: 'August 2026',
      guardianId: 10,
      payerName: 'Anita Prem',
      sentTo: 'anita@example.com',
      issueDate: '2026-08-01',
      dueDate: '2026-08-15',
      totalAmount: 100,
      amountPaid: 0,
      status: 'SENT',
      lineItems: [{ id: 501, feeRecordId: 241, description: 'Preetha Prem — Monthly Fee (August 2026)', amount: 100 }],
      createdAt: '2026-08-01T00:00:00'
    } satisfies Invoice);
    httpMock.expectOne(`${environment.apiUrl}/school/fees/241`).flush({
      studentId: 73,
      studentName: 'Preetha Prem'
    });
    fixture.detectChanges();

    const link = fixture.debugElement.query(By.directive(RouterLink));
    expect(link.nativeElement.textContent.trim()).toBe('Preetha Prem');
    expect(link.nativeElement.getAttribute('href')).toBe('/vidya-rasa/students/73');
    expect(fixture.nativeElement.textContent).toContain('Monthly Fee (August 2026)');
  });
});
