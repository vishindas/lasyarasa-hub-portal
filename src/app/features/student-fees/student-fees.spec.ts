import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ActivatedRoute, provideRouter, convertToParamMap } from '@angular/router';
import { environment } from '../../../environments/environment';
import { StudentFeesComponent } from './student-fees';

function activatedRouteStub(params: Record<string, string>) {
  return { snapshot: { paramMap: convertToParamMap(params) } };
}

/**
 * D3: Fee Summary + Payment History. One backend call
 * (GET .../students/{studentId}/fees) -- these tests cover loading, empty,
 * full-error, per-status display (including the architect-approved PARTIAL
 * contract), class context, and payment-history filtering.
 */
describe('StudentFeesComponent (D3 Student Fees)', () => {
  let httpMock: HttpTestingController;
  const feesUrl = `${environment.apiUrl}/account/students/117/fees`;

  function setup() {
    TestBed.configureTestingModule({
      imports: [StudentFeesComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideAnimationsAsync(), provideRouter([]),
        { provide: ActivatedRoute, useValue: activatedRouteStub({ studentId: '117' }) }
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(StudentFeesComponent);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('loading: shows a spinner before the fees response arrives', () => {
    const fixture = setup();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('Fee Summary');
    httpMock.expectOne(feesUrl).flush([]);
  });

  it('empty: zero fees renders one intentional empty state, no section headings', () => {
    const fixture = setup();
    httpMock.expectOne(feesUrl).flush([]);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('No fees on record for this student yet.');
    expect(text).not.toContain('Fee Summary');
    expect(text).not.toContain('Payment History');
  });

  it('full-error: a rejected fees call shows the error state, never partial/blank data', () => {
    const fixture = setup();
    httpMock.expectOne(feesUrl).flush(
      { code: 'STUDENT_CONTEXT_UNAVAILABLE', message: 'x', resource: null }, { status: 404, statusText: 'Not Found' }
    );
    fixture.detectChanges();

    expect(fixture.componentInstance.loadError()).toBeTruthy();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('Fee Summary');
  });

  it('PENDING renders "Due" with the full amount as outstanding', () => {
    const fixture = setup();
    httpMock.expectOne(feesUrl).flush([
      { feeId: 1, amount: 500, currency: 'INR', dueDate: '2026-09-01', status: 'PENDING', outstandingAmount: 500, outstandingAmountUnknown: false }
    ]);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Due');
    expect(text).toContain('outstanding');
  });

  it('OVERDUE renders "Overdue" distinctly from "Due"', () => {
    const fixture = setup();
    httpMock.expectOne(feesUrl).flush([
      { feeId: 2, amount: 300, currency: 'INR', dueDate: '2026-01-01', status: 'OVERDUE', outstandingAmount: 300, outstandingAmountUnknown: false }
    ]);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Overdue');
  });

  it('PAID renders "Paid" and never shows an outstanding-amount line', () => {
    const fixture = setup();
    httpMock.expectOne(feesUrl).flush([
      { feeId: 3, amount: 400, currency: 'INR', status: 'PAID', outstandingAmount: 0, outstandingAmountUnknown: false, paidAt: '2026-08-05' }
    ]);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Paid');
    expect(text).not.toContain('outstanding');
  });

  /** The architect-approved D3 contract: no guessed number, ever. */
  it('PARTIAL renders "Partially paid", the original amount, no numeric balance, and the exact required copy', () => {
    const fixture = setup();
    httpMock.expectOne(feesUrl).flush([
      { feeId: 4, amount: 600, currency: 'INR', status: 'PARTIAL', outstandingAmountUnknown: true }
    ]);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Partially paid');
    expect(text).toContain('Contact the school for the remaining balance.');
    expect(text).not.toContain('outstanding'); // no numeric outstanding-amount line for PARTIAL
    // The original fee amount is still visible.
    const amountEls = (fixture.nativeElement as HTMLElement).querySelectorAll('.fee-amount');
    expect(Array.from(amountEls).some(el => el.textContent?.includes('600'))).toBe(true);
  });

  it('WAIVED and VOID both render distinct, non-payable-balance labels', () => {
    const fixture = setup();
    httpMock.expectOne(feesUrl).flush([
      { feeId: 5, amount: 200, currency: 'INR', status: 'WAIVED', outstandingAmount: 0, outstandingAmountUnknown: false },
      { feeId: 6, amount: 150, currency: 'INR', status: 'VOID', outstandingAmount: 0, outstandingAmountUnknown: false }
    ]);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Waived');
    expect(text).toContain('Void');
  });

  it('class context: shows the class name when a fee is tied to one, omits it when not', () => {
    const fixture = setup();
    httpMock.expectOne(feesUrl).flush([
      { feeId: 7, classId: 11, className: 'Saturday Beginners', amount: 100, currency: 'INR', status: 'PENDING', outstandingAmount: 100, outstandingAmountUnknown: false },
      { feeId: 8, amount: 50, currency: 'INR', status: 'PENDING', outstandingAmount: 50, outstandingAmountUnknown: false }
    ]);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Saturday Beginners');
  });

  it('multiple classes: each fee keeps its own distinct class context, never mixed', () => {
    const fixture = setup();
    httpMock.expectOne(feesUrl).flush([
      { feeId: 9, classId: 11, className: 'Saturday Beginners', amount: 100, currency: 'INR', status: 'PENDING', outstandingAmount: 100, outstandingAmountUnknown: false },
      { feeId: 10, classId: 12, className: 'Weekday Technique', amount: 150, currency: 'INR', status: 'PENDING', outstandingAmount: 150, outstandingAmountUnknown: false }
    ]);
    fixture.detectChanges();

    const classLines = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.class-line')).map(e => e.textContent);
    expect(classLines).toEqual(['Saturday Beginners', 'Weekday Technique']);
  });

  it('UX-6: shows a secondary "View payment history" action linking to the separate history route', () => {
    const fixture = setup();
    httpMock.expectOne(feesUrl).flush([
      { feeId: 11, amount: 500, currency: 'INR', status: 'PAID', outstandingAmount: 0, outstandingAmountUnknown: false, paidAt: '2026-08-05', invoiceNumber: 'INV-2026-0042' }
    ]);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const link = Array.from(el.querySelectorAll('a')).find(a => a.textContent?.includes('View payment history')) as HTMLAnchorElement | undefined;
    expect(link).toBeTruthy();
    expect(link!.getAttribute('href')).toBe('/my-students/117/fees/history');
    // UX-6: paid fees no longer render a second, duplicative payment-transaction section on this page.
    expect(el.textContent).not.toContain('Payment History');
    expect(el.textContent).not.toContain('INV-2026-0042');
  });

  it('accessibility: H1 is present and the fee list is properly labelled', () => {
    const fixture = setup();
    httpMock.expectOne(feesUrl).flush([
      { feeId: 14, amount: 500, currency: 'INR', status: 'PAID', outstandingAmount: 0, outstandingAmountUnknown: false, paidAt: '2026-08-05' }
    ]);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('h1')?.textContent).toBe('Fees');
    const lists = el.querySelectorAll('ul[aria-labelledby]');
    expect(lists.length).toBe(1);
  });

  it('no payment button, checkout, or edit control anywhere on the page', () => {
    const fixture = setup();
    httpMock.expectOne(feesUrl).flush([
      { feeId: 15, amount: 500, currency: 'INR', status: 'PENDING', outstandingAmount: 500, outstandingAmountUnknown: false }
    ]);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('button').length).toBe(0);
    expect(el.querySelectorAll('input').length).toBe(0);
  });
});
