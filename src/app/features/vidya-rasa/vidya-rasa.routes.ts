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
    path: 'fees/:id',
    loadComponent: () => import('./fees/fee-detail').then(m => m.FeeDetailComponent)
  },
  {
    path: 'invoices',
    loadComponent: () => import('./invoices/invoice-list').then(m => m.InvoiceListComponent)
  },
  {
    path: 'invoices/:id',
    loadComponent: () => import('./invoices/invoice-detail').then(m => m.InvoiceDetailComponent)
  },
  {
    path: 'registrations',
    loadComponent: () => import('./registrations/registration-list').then(m => m.RegistrationListComponent)
  },
  {
    path: 'registrations/form-builder',
    loadComponent: () => import('./registrations/form-builder').then(m => m.FormBuilderComponent)
  },
  {
    path: 'registrations/:id',
    loadComponent: () => import('./registrations/registration-detail').then(m => m.RegistrationDetailComponent)
  },
  { path: '', redirectTo: 'students', pathMatch: 'full' }
];
