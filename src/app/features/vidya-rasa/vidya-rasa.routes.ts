import { Routes } from '@angular/router';

export const VIDYA_RASA_ROUTES: Routes = [
  {
    path: 'students',
    loadComponent: () => import('./students/student-list').then(m => m.StudentListComponent)
  },
  {
    path: 'students/:id',
    loadComponent: () => import('./students/student-profile').then(m => m.StudentProfileComponent)
  },
  {
    path: 'classes',
    loadComponent: () => import('./classes/class-list').then(m => m.ClassListComponent)
  },
  {
    path: 'fees',
    loadComponent: () => import('./fees/fee-list').then(m => m.FeeListComponent)
  },
  {
    path: 'invoices',
    loadComponent: () => import('./invoices/invoice-list').then(m => m.InvoiceListComponent)
  },
  {
    path: 'invoices/:id',
    loadComponent: () => import('./invoices/invoice-detail').then(m => m.InvoiceDetailComponent)
  },
  { path: '', redirectTo: 'students', pathMatch: 'full' }
];
