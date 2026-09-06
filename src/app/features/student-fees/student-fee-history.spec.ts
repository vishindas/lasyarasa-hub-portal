import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ActivatedRoute, provideRouter, convertToParamMap } from '@angular/router';
import { environment } from '../../../environments/environment';
import { StudentFeeHistoryComponent } from './student-fee-history';

function activatedRouteStub(params: Record<string, string>) {
  return { snapshot: { paramMap: convertToParamMap(params) } };
}

/**
 * UX-6: Payment History, split off Fees' own page. Same GET call, same
 * paidAt/invoiceNumber-based "paid" filter Fees' own paymentHistory
 * computed used to apply inline -- these tests migrate that original
 * coverage onto this component's own route/page.
 */
describe('StudentFeeHistoryComponent (UX-6 Payment History)', () => {
  let httpMock: HttpTestingController;
  const feesUrl = `${environment.apiUrl}/account/students/117/fees`;

  function setup() {
    TestBed.configureTestingModule({
      imports: [StudentFeeHistoryComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideAnimationsAsync(), provideRouter([]),
        { provide: ActivatedRoute, useValue: activatedRouteStub({ studentId: '117' }) }
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(StudentFeeHistoryComponent);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('loading: shows a spinner before the fees response arrives', () => {
    const fixture = setup();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('No payments recorded yet.');
    httpMock.expectOne(feesUrl).flush([]);
  });

  it('only shows fees with an actual paidAt or invoice number -- never allocates or infers an amount', () => {
    const fixture = setup();
    httpMock.expectOne(feesUrl).flush([
      { feeId: 11, amount: 500, currency: 'INR', status: 'PAID', outstandingAmount: 0, outstandingAmountUnknown: false, paidAt: '2026-08-05', invoiceNumber: 'INV-2026-0042' },
      { feeId: 12, amount: 200, currency: 'INR', status: 'PENDING', outstandingAmount: 200, outstandingAmountUnknown: false }
    ]);
    fixture.detectChanges();

    expect(fixture.componentInstance.payments().length).toBe(1);
    expect(fixture.componentInstance.payments()[0].feeId).toBe(11);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('INV-2026-0042');
  });

  it('renders its own empty state when no fee has ever been paid or invoiced', () => {
    const fixture = setup();
    httpMock.expectOne(feesUrl).flush([
      { feeId: 13, amount: 200, currency: 'INR', status: 'PENDING', outstandingAmount: 200, outstandingAmountUnknown: false }
    ]);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('No payments recorded yet.');
  });

  it('full-error: a rejected fees call shows the error state, never partial/blank data', () => {
    const fixture = setup();
    httpMock.expectOne(feesUrl).flush(
      { code: 'STUDENT_CONTEXT_UNAVAILABLE', message: 'x', resource: null }, { status: 404, statusText: 'Not Found' }
    );
    fixture.detectChanges();

    expect(fixture.componentInstance.loadError()).toBeTruthy();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('No payments recorded yet.');
  });

  it('rows never render a status chip -- these are transaction records, not fee-status cards', () => {
    const fixture = setup();
    httpMock.expectOne(feesUrl).flush([
      { feeId: 14, amount: 500, currency: 'INR', status: 'PAID', outstandingAmount: 0, outstandingAmountUnknown: false, paidAt: '2026-08-05' }
    ]);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.sp-chip')).toBeNull();
  });

  it('back link returns to the parent Fees page', () => {
    const fixture = setup();
    httpMock.expectOne(feesUrl).flush([]);
    fixture.detectChanges();

    const link = (fixture.nativeElement as HTMLElement).querySelector('a');
    expect(link?.getAttribute('href')).toBe('/my-students/117/fees');
  });

  it('accessibility: H1 reads "Payment History" and the list is labelled', () => {
    const fixture = setup();
    httpMock.expectOne(feesUrl).flush([
      { feeId: 15, amount: 500, currency: 'INR', status: 'PAID', outstandingAmount: 0, outstandingAmountUnknown: false, paidAt: '2026-08-05' }
    ]);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('h1')?.textContent).toBe('Payment History');
    expect(el.querySelector('ul[aria-label]')).toBeTruthy();
  });
});
